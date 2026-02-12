#!/usr/bin/env python3
"""
Split ui/index.js into multiple smaller deferred scripts safely.

Goal:
- Reduce AI editing cost by splitting a huge JS file into smaller parts.
- Keep runtime behavior identical (no build step, no modules).

How:
- We split ONLY at "safe boundaries":
  - Not inside strings (', ", `) including template literal expressions
  - Not inside // or /* */ comments
  - Nesting depth of (), [], {} is 0 (top-level)
  - We prefer boundaries right after ';' or '}' at a newline
- We emit: ui/index_parts/part-XXX.js (classic scripts)
- We rewrite ui/index.html to include ALL parts with `defer` in order, replacing the old
  `<script src="/ui/index.js" defer></script>` reference.
- We replace ui/index.js with a small stub pointing to the new parts directory.

Reversible:
- Git history contains the original ui/index.js (pre-split).
"""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
import re
import subprocess
import tempfile


ROOT = Path(__file__).resolve().parents[1]
UI_DIR = ROOT / "ui"
INDEX_JS = UI_DIR / "index.js"
INDEX_HTML = UI_DIR / "index.html"
PARTS_DIR = UI_DIR / "index_parts"

# Stable, descriptive file names (loaded in this exact order)
PART_FILE_NAMES = [
    "app-core.js",
    "process-playback.js",
    "approvals.js",
    "agent-wizard.js",
    "app-features.js",
]


@dataclass
class ScanState:
    in_line_comment: bool = False
    in_block_comment: bool = False
    quote: str | None = None  # "'", '"'
    in_template: bool = False
    template_expr_depth: int = 0
    escaped: bool = False
    paren: int = 0
    bracket: int = 0
    brace: int = 0


def _is_safe_split_point(state: ScanState) -> bool:
    if state.in_line_comment or state.in_block_comment:
        return False
    if state.quote is not None:
        return False
    if state.in_template:
        return False
    if state.paren or state.bracket or state.brace:
        return False
    return True


def _scan_for_safe_newline_boundaries(text: str) -> list[int]:
    """
    Return indices (character offsets) that are safe split positions (immediately after '\n').
    We only consider '\n' boundaries that occur at top-level and after a strong statement end.
    """
    s = ScanState()
    safe: list[int] = []
    last_sig: str = ""

    i = 0
    n = len(text)
    while i < n:
        ch = text[i]
        nxt = text[i + 1] if i + 1 < n else ""

        # End of line comment
        if s.in_line_comment:
            if ch == "\n":
                s.in_line_comment = False
            i += 1
            continue

        # End of block comment
        if s.in_block_comment:
            if ch == "*" and nxt == "/":
                s.in_block_comment = False
                i += 2
                continue
            i += 1
            continue

        # Inside ' or " string
        if s.quote is not None:
            if s.escaped:
                s.escaped = False
                i += 1
                continue
            if ch == "\\":
                s.escaped = True
                i += 1
                continue
            if ch == s.quote:
                s.quote = None
            i += 1
            continue

        # Inside template literal
        if s.in_template:
            if s.escaped:
                s.escaped = False
                i += 1
                continue
            if ch == "\\":
                s.escaped = True
                i += 1
                continue

            # In raw template content (not inside ${...})
            if s.template_expr_depth == 0:
                if ch == "$" and nxt == "{":
                    s.template_expr_depth = 1
                    i += 2
                    continue
                if ch == "`":
                    s.in_template = False
                    i += 1
                    continue
                i += 1
                continue

            # In template expression: parse like normal JS, but exit when depth returns to 0.
            # Note: within expr, we must handle comments/quotes/templates too (we reuse outer logic).
            if ch == "/" and nxt == "/":
                s.in_line_comment = True
                i += 2
                continue
            if ch == "/" and nxt == "*":
                s.in_block_comment = True
                i += 2
                continue
            if ch in ("'", '"'):
                s.quote = ch
                i += 1
                continue
            if ch == "`":
                # Nested template literal
                s.in_template = True
                # remain in_template, but this starts a nested template; handle by treating it as template content
                # We'll model nesting by incrementing template_expr_depth sentinel and letting raw-template
                # parsing consume until it closes; this is a best-effort but works for our split safety gating.
                # Practically, nested templates are rare here.
                i += 1
                continue

            # Maintain nesting while in template expr
            if ch == "{":
                s.template_expr_depth += 1
            elif ch == "}":
                s.template_expr_depth -= 1
                if s.template_expr_depth == 0:
                    i += 1
                    continue
            elif ch == "(":
                s.paren += 1
            elif ch == ")":
                s.paren = max(0, s.paren - 1)
            elif ch == "[":
                s.bracket += 1
            elif ch == "]":
                s.bracket = max(0, s.bracket - 1)

            i += 1
            continue

        # NORMAL code (not in quote/template/comment)
        if ch == "/" and nxt == "/":
            s.in_line_comment = True
            i += 2
            continue
        if ch == "/" and nxt == "*":
            s.in_block_comment = True
            i += 2
            continue
        if ch in ("'", '"'):
            s.quote = ch
            i += 1
            continue
        if ch == "`":
            s.in_template = True
            s.template_expr_depth = 0
            i += 1
            continue

        if ch == "(":
            s.paren += 1
        elif ch == ")":
            s.paren = max(0, s.paren - 1)
        elif ch == "[":
            s.bracket += 1
        elif ch == "]":
            s.bracket = max(0, s.bracket - 1)
        elif ch == "{":
            s.brace += 1
        elif ch == "}":
            s.brace = max(0, s.brace - 1)

        if ch.strip():
            last_sig = ch

        if ch == "\n" and _is_safe_split_point(s) and last_sig in (";", "}"):
            safe.append(i + 1)  # split AFTER newline

        i += 1

    return safe


def _node_check_syntax(js_text: str) -> tuple[bool, str]:
    """
    Returns (ok, stderr_or_empty). Uses `node --check` as a reliable JS parser.
    """
    with tempfile.NamedTemporaryFile("w", suffix=".js", delete=False) as f:
        f.write(js_text)
        tmp_path = f.name
    try:
        r = subprocess.run(
            ["node", "--check", tmp_path],
            capture_output=True,
            text=True,
            check=False,
        )
        return r.returncode == 0, (r.stderr or r.stdout or "")
    finally:
        try:
            Path(tmp_path).unlink(missing_ok=True)
        except Exception:
            pass


def _choose_splits_validated(text: str, safe_points: list[int], target_bytes: int) -> list[int]:
    """
    Choose split points using Node syntax validation so each chunk is a valid standalone script.
    """
    splits: list[int] = []
    start = 0
    min_chunk = max(48_000, target_bytes // 2)
    max_chunk = max(target_bytes * 3, 300_000)

    # safe_points are positions AFTER '\n'
    sp = [p for p in safe_points if p > 0 and p < len(text)]
    idx = 0

    while start + min_chunk < len(text):
        remaining = len(text) - start
        if remaining <= max_chunk:
            break

        desired = start + target_bytes

        # Advance idx to first safe point >= desired (or >= start+min_chunk if desired too close)
        while idx < len(sp) and sp[idx] < max(desired, start + min_chunk):
            idx += 1
        if idx >= len(sp):
            break

        # Try candidates moving forward until we find a syntactically-valid chunk.
        best = None
        best_err = ""
        tries = 0
        j = idx
        while j < len(sp):
            point = sp[j]
            if point - start > max_chunk:
                break
            chunk = text[start:point]
            ok, err = _node_check_syntax(chunk)
            tries += 1
            if ok:
                best = point
                idx = j + 1
                break
            best_err = err
            j += 1

        if best is None:
            raise RuntimeError(
                "Failed to find a valid split point.\n"
                f"Last node error (truncated): {best_err[:400]}"
            )

        splits.append(best)
        start = best

        # Safety valve to avoid pathological slow runs
        if len(splits) > 40:
            break

    # Validate final remainder too
    ok, err = _node_check_syntax(text[start:])
    if not ok:
        raise RuntimeError(f"Final remainder failed syntax check: {err[:500]}")

    return splits


def _write_parts(text: str, split_points: list[int]) -> list[Path]:
    PARTS_DIR.mkdir(parents=True, exist_ok=True)
    # Clean only the parts this script manages (do NOT delete other ui/index_parts assets)
    managed = set(PART_FILE_NAMES)
    # also remove any previous fallback extra-* chunks
    for old in PARTS_DIR.glob("extra-*.js"):
        old.unlink(missing_ok=True)
    for name in managed:
        (PARTS_DIR / name).unlink(missing_ok=True)

    points = [0] + split_points + [len(text)]
    part_paths: list[Path] = []

    # Build line number mapping for nicer headers
    # We'll compute line numbers via counting '\n'
    newline_positions = [m.start() for m in re.finditer("\n", text)]

    def _line_at(pos: int) -> int:
        # 1-indexed line number
        # bisect right
        lo, hi = 0, len(newline_positions)
        while lo < hi:
            mid = (lo + hi) // 2
            if newline_positions[mid] < pos:
                lo = mid + 1
            else:
                hi = mid
        return lo + 1

    for i in range(len(points) - 1):
        a, b = points[i], points[i + 1]
        part_text = text[a:b]
        start_line = _line_at(a)
        end_line = _line_at(b)

        if i < len(PART_FILE_NAMES):
            part_name = PART_FILE_NAMES[i]
        else:
            # Safety fallback (avoid numeric names; keep deterministic)
            part_name = f"extra-{chr(ord('a') + (i - len(PART_FILE_NAMES)))}.js"
        out_path = PARTS_DIR / part_name
        header = (
            f"// Auto-generated from ui/index.js\n"
            f"// Chunk: {part_name} (lines {start_line}-{end_line})\n"
            f"// DO NOT reorder chunks.\n\n"
        )
        out_path.write_text(header + part_text.lstrip("\n"), encoding="utf-8")
        part_paths.append(out_path)

    return part_paths


def _rewrite_index_html(parts: list[Path]) -> None:
    html = INDEX_HTML.read_text(encoding="utf-8")

    tags = "\n".join(f'    <script src="/ui/index_parts/{p.name}" defer></script>' for p in parts)

    # 1) Preferred: replace the old single include
    old_tag_re = re.compile(r'<script\s+src="/ui/index\.js"\s+defer></script>')
    if old_tag_re.search(html):
        html2 = old_tag_re.sub(tags, html, count=1)
        INDEX_HTML.write_text(html2, encoding="utf-8")
        return

    # 2) Already split: replace existing consecutive parts block
    parts_block_re = re.compile(
        r'(?:\s*<script\s+src="/ui/index_parts/[^"]+"\s+defer></script>\s*\n)+',
        re.MULTILINE,
    )
    if not parts_block_re.search(html):
        raise RuntimeError(
            "Could not find either `/ui/index.js` include or existing `/ui/index_parts/part-*.js` block in ui/index.html"
        )
    html2 = parts_block_re.sub(tags + "\n", html, count=1)
    INDEX_HTML.write_text(html2, encoding="utf-8")


def _write_index_js_stub(parts: list[Path]) -> None:
    manifest = "\n".join(f"// - /ui/index_parts/{p.name}" for p in parts)
    stub = f"""// ui/index.js (stub)
// This file was split into multiple deferred scripts for easier maintenance.
// If you need to edit the Admin UI, update the appropriate file in `ui/index_parts/`.
//
// Loaded parts (in order):
{manifest}
"""
    INDEX_JS.write_text(stub, encoding="utf-8")


def _read_source_js() -> str:
    """
    Use the committed ui/index.js (HEAD) as the source of truth.
    This allows re-running the splitter even after ui/index.js was replaced by the stub.
    """
    # If current file is large, use it; otherwise fallback to git HEAD.
    try:
        current = INDEX_JS.read_text(encoding="utf-8")
        if len(current) > 200_000 and "split into multiple deferred scripts" not in current:
            return current
    except Exception:
        pass

    try:
        r = subprocess.run(
            ["git", "show", "HEAD:ui/index.js"],
            cwd=str(ROOT),
            capture_output=True,
            text=True,
            check=True,
        )
        return r.stdout
    except Exception as e:
        raise RuntimeError("Could not read source JS from git (HEAD:ui/index.js)") from e


def main() -> None:
    if not INDEX_JS.exists():
        raise RuntimeError(f"Missing file: {INDEX_JS}")
    if not INDEX_HTML.exists():
        raise RuntimeError(f"Missing file: {INDEX_HTML}")

    original = _read_source_js()
    safe_points = _scan_for_safe_newline_boundaries(original)
    if len(safe_points) < 20:
        raise RuntimeError("Not enough safe split points found; aborting for safety")

    # Target ~12-16 parts for the current file size
    target_bytes = max(80_000, len(original) // 14)
    split_points = _choose_splits_validated(original, safe_points, target_bytes=target_bytes)
    parts = _write_parts(original, split_points)

    _rewrite_index_html(parts)
    _write_index_js_stub(parts)

    # Validate all parts for safety
    for p in parts:
        ok, err = _node_check_syntax(p.read_text(encoding="utf-8"))
        if not ok:
            raise RuntimeError(f"Part failed syntax check: {p.name}\n{err[:500]}")

    print("✅ JS split complete:")
    print(f" - Parts: {len(parts)} files in {PARTS_DIR.relative_to(ROOT)}")
    print(" - Updated: ui/index.html")
    print(" - Replaced: ui/index.js (stub)")


if __name__ == "__main__":
    main()


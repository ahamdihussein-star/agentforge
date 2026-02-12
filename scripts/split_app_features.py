#!/usr/bin/env python3
"""
Split ui/index_parts/app-features.js into multiple smaller feature chunks.

Why:
- app-features.js is the largest JS file in the repo; splitting helps AI/dev iteration.

Design:
- No bundler, no ES modules.
- Use classic scripts loaded with `defer` in order.
- Only move code verbatim; no behavioral changes intended.

Output (in order):
- ui/index_parts/features-demo-tools.js
- ui/index_parts/features-tools-wizard.js
- ui/index_parts/features-chat.js
- ui/index_parts/features-auth-permissions.js
- ui/index_parts/features-security-identity.js
- ui/index_parts/features-approvals-page.js

The split is done near well-known section headers (line numbers), adjusted to
safe newline boundaries and validated with `node --check`.
"""

from __future__ import annotations

from pathlib import Path
import re
import subprocess
import tempfile


ROOT = Path(__file__).resolve().parents[1]
UI_DIR = ROOT / "ui"
SRC = UI_DIR / "index_parts" / "app-features.js"
INDEX_HTML = UI_DIR / "index.html"
OUT_DIR = UI_DIR / "index_parts"

OUT_FILES = [
    "features-demo-tools.js",
    "features-tools-wizard.js",
    "features-chat.js",
    "features-auth-permissions.js",
    "features-security-identity.js",
    "features-approvals-page.js",
]

# These are line numbers (1-based) where big section headers start in the current file.
# We'll split *before* these sections (i.e., at the start of these lines), with validation.
TARGET_SPLIT_LINES = [
    2476,   # URL scraping / tooling helpers start (end of tool type configs)
    6800,   # Chat conversation management section start
    10940,  # Authentication & security functions start
    12261,  # Security center functions start
    13298,  # Approvals page start
]


def _node_check(js_text: str) -> tuple[bool, str]:
    with tempfile.NamedTemporaryFile("w", suffix=".js", delete=False) as f:
        f.write(js_text)
        tmp = f.name
    try:
        r = subprocess.run(["node", "--check", tmp], capture_output=True, text=True)
        ok = r.returncode == 0
        msg = (r.stderr or r.stdout or "")
        return ok, msg
    finally:
        try:
            Path(tmp).unlink(missing_ok=True)
        except Exception:
            pass


def _line_start_offsets(text: str) -> list[int]:
    # offsets[i] = char offset of line i+1
    offsets = [0]
    for m in re.finditer("\n", text):
        offsets.append(m.end())
    return offsets


def _safe_boundary_positions(text: str) -> list[int]:
    """
    Conservative safe boundaries: positions right after '\n' where we're not inside a template literal.
    We keep it simple and rely on node validation to ensure chunk correctness.
    """
    safe = [0]
    in_tpl = False
    esc = False
    for i, ch in enumerate(text):
        if in_tpl:
            if esc:
                esc = False
            elif ch == "\\":
                esc = True
            elif ch == "`":
                in_tpl = False
        else:
            if ch == "`":
                in_tpl = True
        if ch == "\n":
            safe.append(i + 1)
    safe.append(len(text))
    return sorted(set(safe))


def _choose_split_near(text: str, desired: int, window: int = 20000) -> int:
    """
    Find a split boundary near 'desired' that makes both sides parse with node.
    """
    safe = _safe_boundary_positions(text)
    lo = max(0, desired - window)
    hi = min(len(text), desired + window)
    candidates = [p for p in safe if lo <= p <= hi]
    # prefer forward candidates (keep early chunk sizes similar), then backward
    candidates_sorted = sorted(candidates, key=lambda p: (abs(p - desired), p < desired))

    for p in candidates_sorted:
        left = text[:p]
        right = text[p:]
        ok1, _ = _node_check(left)
        if not ok1:
            continue
        ok2, _ = _node_check(right)
        if not ok2:
            continue
        return p
    raise RuntimeError(f"Could not find a valid split near offset {desired}")


def _write_chunks(text: str, split_points: list[int]) -> list[Path]:
    points = [0] + split_points + [len(text)]
    if len(points) - 1 != len(OUT_FILES):
        raise RuntimeError("Split count does not match OUT_FILES length")

    out_paths: list[Path] = []
    for idx in range(len(OUT_FILES)):
        a, b = points[idx], points[idx + 1]
        chunk = text[a:b]
        out_path = OUT_DIR / OUT_FILES[idx]
        header = (
            "// Extracted from ui/index_parts/app-features.js\n"
            f"// Chunk: {out_path.name}\n"
            "// Loaded via defer in ui/index.html; do not reorder.\n\n"
        )
        out_path.write_text(header + chunk.lstrip("\n"), encoding="utf-8")
        out_paths.append(out_path)
    return out_paths


def _update_index_html(chunk_paths: list[Path]) -> None:
    html = INDEX_HTML.read_text(encoding="utf-8")
    old = '<script src="/ui/index_parts/app-features.js" defer></script>'
    if old not in html:
        raise RuntimeError("Could not find app-features.js include in ui/index.html")
    tags = "\n".join(f'    <script src="/ui/index_parts/{p.name}" defer></script>' for p in chunk_paths)
    INDEX_HTML.write_text(html.replace(old, tags), encoding="utf-8")


def _shrink_source_stub(chunk_paths: list[Path]) -> None:
    manifest = "\n".join(f"// - /ui/index_parts/{p.name}" for p in chunk_paths)
    stub = (
        "// ui/index_parts/app-features.js (stub)\n"
        "// This file was split into smaller feature chunks for easier maintenance.\n"
        "// Edit the appropriate `features-*.js` file instead.\n"
        "//\n"
        "// Loaded chunks (in order):\n"
        f"{manifest}\n"
    )
    SRC.write_text(stub, encoding="utf-8")


def main() -> None:
    if not SRC.exists():
        raise RuntimeError(f"Missing source: {SRC}")

    text = SRC.read_text(encoding="utf-8")

    # Compute desired offsets from line starts
    offsets = _line_start_offsets(text)
    desired_offsets = []
    for ln in TARGET_SPLIT_LINES:
        if ln - 1 >= len(offsets):
            raise RuntimeError(f"Line {ln} out of range for {SRC}")
        desired_offsets.append(offsets[ln - 1])

    split_points: list[int] = []
    remaining = text
    consumed = 0
    for desired in desired_offsets:
        # desired is in original coordinates; adjust for already-consumed prefix
        target = desired - consumed
        p = _choose_split_near(remaining, target)
        split_points.append(consumed + p)
        remaining = text[consumed + p :]
        consumed = consumed + p

    # Ensure deterministic and increasing
    split_points = sorted(set(split_points))
    if len(split_points) != len(TARGET_SPLIT_LINES):
        raise RuntimeError("Unexpected split point count (validation may have collapsed points)")

    # Remove old generated feature chunks if present
    for name in OUT_FILES:
        (OUT_DIR / name).unlink(missing_ok=True)

    chunk_paths = _write_chunks(text, split_points)

    # Validate each chunk
    for p in chunk_paths:
        ok, msg = _node_check(p.read_text(encoding="utf-8"))
        if not ok:
            raise RuntimeError(f"Chunk failed syntax check: {p.name}\n{msg[:400]}")

    _update_index_html(chunk_paths)
    _shrink_source_stub(chunk_paths)

    print("✅ Split app-features.js into:")
    for p in chunk_paths:
        print(" -", p.relative_to(ROOT))


if __name__ == "__main__":
    main()


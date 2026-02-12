#!/usr/bin/env python3
"""
PHASE 4 — Cleanup Plan (non-destructive).

Outputs:
- docs/PHASE4_CLEANUP_PROPOSAL.md

Rules:
- Do not delete anything.
- Identify likely-obsolete docs/sections, duplicates, empty/unreferenced files.
- Evidence-based (file exists, size/lines, simple reference checks).
"""

from __future__ import annotations

import os
import re
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "docs" / "PHASE4_CLEANUP_PROPOSAL.md"

SKIP_DIRS = {".git", "__pycache__", ".venv", "venv", "node_modules", "chroma_data"}


def read_text(p: Path) -> str | None:
    try:
        data = p.read_bytes()
    except Exception:
        return None
    if b"\x00" in data:
        return None
    try:
        return data.decode("utf-8")
    except UnicodeDecodeError:
        return data.decode("utf-8", errors="replace")


def walk_all_files() -> list[Path]:
    out: list[Path] = []
    for dirpath, dirnames, filenames in os.walk(ROOT):
        dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS]
        for fn in filenames:
            out.append(Path(dirpath) / fn)
    out.sort(key=lambda p: p.relative_to(ROOT).as_posix())
    return out


def main() -> None:
    files = walk_all_files()
    docs = [p for p in files if p.suffix.lower() == ".md" and p.is_file()]

    # Detect empty/suspiciously small files
    empty = []
    tiny = []
    for p in files:
        if not p.is_file():
            continue
        try:
            size = p.stat().st_size
        except Exception:
            continue
        if size == 0:
            empty.append(p)
        elif size <= 32:
            tiny.append(p)

    # Detect docs referencing missing code paths
    missing_refs: list[tuple[str, str]] = []
    path_tick_re = re.compile(r"`([^`]+\.(?:py|js|html|css|yml|yaml|ini|toml|sh))`")
    for d in docs:
        t = read_text(d) or ""
        for rp in sorted(set(path_tick_re.findall(t))):
            if not (ROOT / rp).exists():
                missing_refs.append((d.relative_to(ROOT).as_posix(), rp))

    # Detect duplicated headings across docs
    heading_re = re.compile(r"^(#{1,6})\s+(.+)$", re.M)
    heading_map: dict[str, list[str]] = {}
    for d in docs:
        t = read_text(d) or ""
        for _, title in heading_re.findall(t):
            key = title.strip()
            heading_map.setdefault(key, []).append(d.relative_to(ROOT).as_posix())
    duplicated_headings = {h: sorted(set(fs)) for h, fs in heading_map.items() if len(set(fs)) > 1}

    def esc_cell(v: str) -> str:
        return v.replace("|", "\\|")

    lines: list[str] = []
    lines.append("## PHASE 4 — Cleanup Proposal (non-destructive)\n\n")
    lines.append("This is a proposal only; **no files are deleted**.\n\n")

    lines.append("### Documentation files that reference missing paths\n\n")
    if not missing_refs:
        lines.append("None detected.\n\n")
    else:
        lines.append("| Doc file | Missing referenced path |\n")
        lines.append("|---|---|\n")
        for doc, rp in missing_refs:
            lines.append(f"| `{doc}` | `{rp}` |\n")
        lines.append("\n")

    lines.append("### Duplicate headings across docs (possible duplication)\n\n")
    if not duplicated_headings:
        lines.append("None detected.\n\n")
    else:
        # show top 50 to keep report readable
        lines.append("| Heading | Appears in |\n")
        lines.append("|---|---|\n")
        for h, fs in sorted(duplicated_headings.items())[:50]:
            lines.append("| " + esc_cell(h) + " | " + ", ".join(f"`{esc_cell(f)}`" for f in fs) + " |\n")
        if len(duplicated_headings) > 50:
            lines.append(f"\n(… {len(duplicated_headings)-50} more duplicated headings)\n\n")

    lines.append("### Empty / tiny files\n\n")
    if not empty and not tiny:
        lines.append("None detected.\n\n")
    else:
        if empty:
            lines.append("**Empty files:**\n")
            for p in empty:
                lines.append(f"- `{p.relative_to(ROOT).as_posix()}`\n")
            lines.append("\n")
        if tiny:
            lines.append("**Very small files (<=32 bytes):**\n")
            for p in tiny[:80]:
                lines.append(f"- `{p.relative_to(ROOT).as_posix()}`\n")
            if len(tiny) > 80:
                lines.append(f"- (… {len(tiny)-80} more)\n")
            lines.append("\n")

    lines.append("### Suggested non-destructive next steps\n\n")
    lines.append("- Consolidate duplicated doc sections by keeping one canonical section and adding links from duplicates (do not remove duplicates unless explicitly desired).\n")
    lines.append("- For any docs referencing missing code paths, mark the section as **Deprecated — functionality removed from codebase** and link to the replacement (if present).\n")
    lines.append("- Add a short \"Documentation status\" block at the top of major docs pointing to the Phase 0–4 generated reports.\n")

    OUT.write_text("".join(lines), encoding="utf-8")
    print(f"Wrote: {OUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()


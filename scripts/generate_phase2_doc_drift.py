#!/usr/bin/env python3
"""
PHASE 2 — Documentation Reconciliation (drift matrix).

Outputs:
- docs/PHASE2_DOCUMENTATION_DRIFT_MATRIX.md

Method (evidence-based, conservative):
- Parse each docs/*.md into sections by Markdown headings.
- For each section:
  - Detect referenced code paths in backticks: `path/to/file.ext`
    - If missing on disk -> mark mismatch
  - Detect referenced API paths like /api/... or /process/... inside inline code or plain text
    - If no occurrence in any code file -> mark mismatch (heuristic; may be indirect)
  - Detect referenced symbols in backticks (ClassName, functionName)
    - If not found anywhere in code (simple substring search) -> mark unknown/mismatch

Status levels:
- Accurate (no mismatches detected)
- Needs Update (mismatch detected)
- Outdated but keep section (explicitly references removed things)
- Orphaned documentation (doc content references no code and appears standalone; heuristic)
- Duplicated (same heading title appears in multiple docs with high overlap; heuristic)

This script DOES NOT edit docs. It produces the drift matrix for review.
"""

from __future__ import annotations

import os
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable


ROOT = Path(__file__).resolve().parents[1]
DOCS_DIR = ROOT / "docs"
OUT = DOCS_DIR / "PHASE2_DOCUMENTATION_DRIFT_MATRIX.md"

SKIP_DIRS = {".git", "__pycache__", ".venv", "venv", "node_modules", "chroma_data"}

CODE_EXTS = {".py", ".js", ".html", ".css", ".sh", ".ini", ".yml", ".yaml", ".toml"}


@dataclass
class Section:
    doc_file: str
    heading: str
    level: int
    start_line: int
    content: str


def read_text(p: Path) -> str:
    data = p.read_bytes()
    if b"\x00" in data:
        return ""
    try:
        return data.decode("utf-8")
    except UnicodeDecodeError:
        return data.decode("utf-8", errors="replace")


def walk_code_text_corpus() -> str:
    # Build a single searchable corpus of all code/config text for substring checks.
    parts: list[str] = []
    for dirpath, dirnames, filenames in os.walk(ROOT):
        dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS]
        for fn in filenames:
            p = Path(dirpath) / fn
            if p.suffix.lower() not in CODE_EXTS:
                continue
            if p.name.endswith(".png") or p.name.endswith(".jpg"):
                continue
            t = read_text(p)
            if t:
                parts.append(f"\n\n# FILE: {p.relative_to(ROOT).as_posix()}\n")
                parts.append(t)
    return "".join(parts)


def parse_markdown_sections(doc_path: Path) -> list[Section]:
    text = read_text(doc_path)
    lines = text.splitlines()
    sections: list[Section] = []

    current_heading = "(no heading)"
    current_level = 0
    current_start = 1
    buf: list[str] = []

    def flush(end_line: int) -> None:
        nonlocal buf, current_heading, current_level, current_start
        content = "\n".join(buf).strip()
        sections.append(
            Section(
                doc_file=doc_path.relative_to(ROOT).as_posix(),
                heading=current_heading,
                level=current_level,
                start_line=current_start,
                content=content,
            )
        )
        buf = []

    for i, line in enumerate(lines, start=1):
        m = re.match(r"^(#{1,6})\s+(.+)$", line.strip())
        if m:
            # flush previous section
            flush(i - 1)
            current_level = len(m.group(1))
            current_heading = m.group(2).strip()
            current_start = i
            continue
        buf.append(line)

    flush(len(lines))
    return sections


PATH_TICK_RE = re.compile(r"`([^`]+\.(?:py|js|html|css|md|yml|yaml|ini|toml|sh))`")
API_PATH_RE = re.compile(r"(?:(?:`)?)(/(?:api|process|ui|chat|lab)[/A-Za-z0-9._~!$&'()*+,;=:@%\\-]+)")
SYMBOL_TICK_RE = re.compile(r"`([A-Za-z_][A-Za-z0-9_]{2,})`")


def summarize_claim(section: Section) -> str:
    # First non-empty line of section content
    for line in section.content.splitlines():
        s = line.strip()
        if s:
            return s[:180]
    return "(empty section)"


def assess_section(section: Section, corpus: str) -> tuple[str, str, str]:
    """
    Returns (status, code_reality, action_taken)
    """
    content = section.content
    referenced_paths = sorted(set(PATH_TICK_RE.findall(content)))
    api_paths = sorted(set(API_PATH_RE.findall(content)))
    symbols = sorted(set(SYMBOL_TICK_RE.findall(content)))

    mismatches: list[str] = []
    notes: list[str] = []

    # Validate file paths
    for rp in referenced_paths:
        if not (ROOT / rp).exists():
            mismatches.append(f"Missing referenced file: {rp}")

    # Validate API paths existence in corpus (heuristic)
    for ap in api_paths[:40]:
        if ap not in corpus:
            notes.append(f"API path not found in code corpus (heuristic): {ap}")

    # Validate symbol names (heuristic substring)
    for sym in symbols[:60]:
        # Skip common words that appear in docs
        if sym.lower() in {"the","and","for","with","from","this","that","true","false","none","json","html","css","js"}:
            continue
        if sym not in corpus:
            notes.append(f"Symbol not found in code corpus (heuristic): {sym}")

    if mismatches:
        status = "Needs Update"
        code_reality = "; ".join(mismatches)
        action = "Rewrite section content to match repository reality"
        return status, code_reality, action

    if referenced_paths or api_paths or symbols:
        # No hard mismatches, but may have heuristic unknowns.
        if notes:
            status = "Needs Update"
            code_reality = "No missing files detected; " + "; ".join(notes[:6])
            action = "Review claims; update wording or add code references"
            return status, code_reality, action
        status = "Accurate"
        code_reality = "Referenced items present (no mismatches detected)"
        action = "No change"
        return status, code_reality, action

    # No references at all
    status = "Orphaned documentation"
    code_reality = "No direct code/API references detected in section"
    action = "Keep section; add references or mark as conceptual"
    return status, code_reality, action


def main() -> None:
    doc_files = sorted(DOCS_DIR.glob("*.md"))
    corpus = walk_code_text_corpus()

    sections: list[Section] = []
    for d in doc_files:
        sections.extend(parse_markdown_sections(d))

    # Drift Matrix
    out: list[str] = []
    out.append("## PHASE 2 — Documentation Drift Matrix\n\n")
    out.append("This report is generated from repository contents (heuristic checks for symbols/API paths; hard checks for referenced file paths).\n\n")
    out.append("| Doc File | Section | Original Claim Summary | Code Reality | Action Taken | Status |\n")
    out.append("|---|---|---|---|---|---|\n")

    def esc_cell(v: str) -> str:
        # Markdown table cell escape
        return v.replace("|", "\\|")

    for s in sections:
        claim = summarize_claim(s)
        status, reality, action = assess_section(s, corpus)
        sec_name = f"{'#'*s.level} {s.heading}" if s.level else s.heading
        out.append(
            "| "
            + f"`{esc_cell(s.doc_file)}`"
            + " | "
            + esc_cell(sec_name)
            + " | "
            + esc_cell(claim)
            + " | "
            + esc_cell(reality)
            + " | "
            + esc_cell(action)
            + " | "
            + f"**{esc_cell(status)}**"
            + " |\n"
        )

    OUT.write_text("".join(out), encoding="utf-8")
    print(f"Wrote: {OUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()


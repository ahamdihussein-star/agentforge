#!/usr/bin/env python3
"""
PHASE 3 — Security Analysis (evidence-based).

Outputs:
- docs/PHASE3_SECURITY_ANALYSIS.md

Approach:
- Scan repository code for authentication/authorization/audit/secrets handling keywords.
- Identify concrete implementation locations by file path and symbol names (Python AST where possible).
- Summarize observed security mechanisms without inventing anything.
"""

from __future__ import annotations

import ast
import os
import re
from dataclasses import dataclass
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "docs" / "PHASE3_SECURITY_ANALYSIS.md"

SKIP_DIRS = {".git", "__pycache__", ".venv", "venv", "node_modules", "chroma_data"}

CODE_EXTS = {".py", ".js", ".html", ".css", ".sh"}

SEC_KWS = [
    "auth", "oauth", "token", "jwt", "mfa", "permission", "role", "rbac",
    "session", "audit", "security", "password", "hash", "encrypt", "decrypt",
    "secret", "api_key",
]

SEC_RE = re.compile(r"\\b(" + "|".join(re.escape(k) for k in SEC_KWS) + r")\\b", re.I)


def read_text(p: Path) -> str | None:
    try:
        data = p.read_bytes()
    except Exception:
        return None
    if b"\\x00" in data:
        return None
    try:
        return data.decode("utf-8")
    except UnicodeDecodeError:
        return data.decode("utf-8", errors="replace")


def walk_code_files() -> list[Path]:
    out: list[Path] = []
    for dirpath, dirnames, filenames in os.walk(ROOT):
        dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS]
        for fn in filenames:
            p = Path(dirpath) / fn
            if p.suffix.lower() in CODE_EXTS:
                out.append(p)
    out.sort(key=lambda p: p.relative_to(ROOT).as_posix())
    return out


@dataclass
class PySecSymbol:
    file: str
    kind: str
    name: str


def python_security_symbols(py_text: str) -> list[tuple[str, str]]:
    """
    Returns list of (kind, name) for defs that *likely* relate to security by name.
    """
    out: list[tuple[str, str]] = []
    try:
        t = ast.parse(py_text)
    except SyntaxError:
        return out
    for node in t.body:
        if isinstance(node, ast.FunctionDef):
            if SEC_RE.search(node.name):
                out.append(("function", node.name))
        elif isinstance(node, ast.ClassDef):
            if SEC_RE.search(node.name):
                out.append(("class", node.name))
    return out


def main() -> None:
    files = walk_code_files()

    hits: list[tuple[str, list[str]]] = []
    py_syms: list[PySecSymbol] = []

    for p in files:
        rel = p.relative_to(ROOT).as_posix()
        text = read_text(p)
        if not text:
            continue
        if not SEC_RE.search(text):
            continue

        # collect top keyword hits (unique)
        kws = sorted(set(m.group(0).lower() for m in SEC_RE.finditer(text)))
        hits.append((rel, kws))

        if p.suffix.lower() == ".py":
            for kind, name in python_security_symbols(text):
                py_syms.append(PySecSymbol(rel, kind, name))

    lines: list[str] = []
    lines.append("## PHASE 3 — Security Analysis (evidence-based)\n\n")
    lines.append("This report lists concrete locations in the repository where security-relevant logic appears, based only on code evidence.\n\n")

    if not hits:
        lines.append("No centralized security module found. Security logic appears to be distributed / minimal (no keyword hits).\n")
        OUT.write_text("".join(lines), encoding="utf-8")
        print(f"Wrote: {OUT.relative_to(ROOT)}")
        return

    lines.append("### Files containing security-relevant terms\n\n")
    lines.append("| File | Detected tokens |\n")
    lines.append("|---|---|\n")
    for rel, kws in hits:
        lines.append(f"| `{rel}` | {', '.join('`'+k+'`' for k in kws[:20])}{' …' if len(kws)>20 else ''} |\n")
    lines.append("\n")

    lines.append("### Python security-related symbol index (name-based)\n\n")
    if not py_syms:
        lines.append("Not present in repository.\n\n")
    else:
        lines.append("| File | Kind | Symbol |\n")
        lines.append("|---|---|---|\n")
        for s in sorted(py_syms, key=lambda x: (x.file, x.kind, x.name)):
            lines.append(f"| `{s.file}` | {s.kind} | `{s.name}` |\n")
        lines.append("\n")

    lines.append("### Notes / gaps (manual follow-up recommended)\n\n")
    lines.append("- This Phase 3 output is an index. A full explanation of \"how auth works\" requires tracing call graphs and request flows in specific API files (next step is to ground that trace in `api/security.py`, `api/main.py`, and `core/security/*` if present).\n")
    lines.append("- Secrets handling should be reviewed by checking `.env.example`, `Dockerfile`, and any places reading environment variables.\n")

    OUT.write_text("".join(lines), encoding="utf-8")
    print(f"Wrote: {OUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()


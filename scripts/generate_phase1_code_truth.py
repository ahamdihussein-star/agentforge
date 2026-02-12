#!/usr/bin/env python3
"""
PHASE 1 — Code Truth Extraction (code-derived, repository-accurate).

Generates a markdown report that summarizes each code file:
- Purpose (best-effort from docstring/comments + path)
- Key functions/classes (Python: AST; JS: heuristics; HTML: page title)
- Inputs/Outputs (best-effort heuristics)
- Side effects (DB/network/filesystem) based on evidence in file content
- Dependencies (Python imports; JS fetch/CDN usage; HTML script/link refs)
- Error handling / auth checks: evidence-based string/AST heuristics

Outputs:
- docs/PHASE1_CODE_TRUTH_REPORT.md

Constraints:
- Do not invent behavior. If not evidenced, state "Not present in repository." or "Unknown".
"""

from __future__ import annotations

import ast
import os
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Iterable


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "docs" / "PHASE1_CODE_TRUTH_REPORT.md"

SKIP_DIRS = {".git", "__pycache__", ".venv", "venv", "node_modules", "chroma_data"}

CODE_EXTS = {".py", ".js", ".html", ".css", ".sh"}

SECURITY_PAT = re.compile(r"\b(auth|oauth|jwt|token|mfa|permission|role|rbac|audit|encrypt|hash|session)\b", re.I)
DB_PAT = re.compile(r"\b(sqlalchemy|alembic|Session\b|create_engine|engine\.|Base\s*=|Column\s*\(|relationship\s*\()\b")
NET_PAT = re.compile(r"\b(fetch\s*\(|requests\.\w+\(|httpx\.\w+\(|aiohttp\.\w+\(|urllib\.)\b")
FS_PAT = re.compile(r"\b(open\s*\(|Path\(|os\.makedirs|shutil\.|write_text|read_text|read_bytes|write_bytes)\b")


def walk_code_files() -> list[Path]:
    out: list[Path] = []
    for dirpath, dirnames, filenames in os.walk(ROOT):
        dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS]
        for fn in filenames:
            p = Path(dirpath) / fn
            if p.suffix.lower() in CODE_EXTS or p.name == "Dockerfile":
                out.append(p)
    out.sort(key=lambda p: p.relative_to(ROOT).as_posix())
    return out


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


def md_escape(s: str) -> str:
    return s.replace("|", "\\|")


def first_nonempty_lines(text: str, n: int = 12) -> list[str]:
    lines = []
    for line in text.splitlines():
        if line.strip():
            lines.append(line.rstrip())
        if len(lines) >= n:
            break
    return lines


def python_imports(text: str) -> list[str]:
    imports: list[str] = []
    try:
        t = ast.parse(text)
    except SyntaxError:
        return imports
    for node in t.body:
        if isinstance(node, ast.Import):
            for n in node.names:
                imports.append(n.name)
        elif isinstance(node, ast.ImportFrom):
            mod = node.module or ""
            for n in node.names:
                imports.append(f"{mod}.{n.name}" if mod else n.name)
    return sorted(set(imports))


@dataclass
class PySymbol:
    kind: str  # class/function
    name: str
    doc: str | None
    args: str | None


def python_symbols(text: str) -> list[PySymbol]:
    syms: list[PySymbol] = []
    try:
        t = ast.parse(text)
    except SyntaxError:
        return syms

    for node in t.body:
        if isinstance(node, ast.ClassDef):
            syms.append(PySymbol("class", node.name, ast.get_docstring(node), None))
        elif isinstance(node, ast.FunctionDef):
            # Build a minimal signature string (names only)
            args = []
            for a in node.args.args:
                args.append(a.arg)
            if node.args.vararg:
                args.append("*" + node.args.vararg.arg)
            for a in node.args.kwonlyargs:
                args.append(a.arg)
            if node.args.kwarg:
                args.append("**" + node.args.kwarg.arg)
            sig = "(" + ", ".join(args) + ")"
            syms.append(PySymbol("function", node.name, ast.get_docstring(node), sig))
    return syms


def html_title(text: str) -> str | None:
    m = re.search(r"<title>\s*([^<]+?)\s*</title>", text, re.I)
    return m.group(1).strip() if m else None


def html_refs(text: str) -> dict[str, list[str]]:
    # script src + link href (best effort)
    scripts = re.findall(r'<script[^>]+src="([^"]+)"', text, re.I)
    links = re.findall(r'<link[^>]+href="([^"]+)"', text, re.I)
    return {"scripts": scripts, "links": links}


def js_exports_heuristic(text: str) -> list[str]:
    # Not ES modules; just list top-level function names patterns
    names = set()
    for m in re.finditer(r"^\s*function\s+([A-Za-z0-9_]+)\s*\(", text, re.M):
        names.add(m.group(1))
    for m in re.finditer(r"^\s*(?:const|let|var)\s+([A-Za-z0-9_]+)\s*=\s*\(", text, re.M):
        names.add(m.group(1))
    return sorted(names)


def evidence_flags(text: str) -> dict[str, bool]:
    return {
        "db": bool(DB_PAT.search(text)),
        "network": bool(NET_PAT.search(text)),
        "filesystem": bool(FS_PAT.search(text)),
        "security_terms": bool(SECURITY_PAT.search(text)),
    }


def purpose_from_text(rel: str, text: str | None) -> str:
    if text is None:
        return "Unknown (file is not readable as text)"
    if rel.endswith(".py"):
        doc = ast.get_docstring(ast.parse(text)) if text.strip() else None
        if doc:
            return doc.splitlines()[0].strip()
        # fall back to header comments
        for ln in first_nonempty_lines(text, 20):
            if ln.strip().startswith("#"):
                return ln.strip("# ").strip()
    if rel.endswith(".js"):
        for ln in first_nonempty_lines(text, 20):
            if ln.strip().startswith("//"):
                return ln.strip("/ ").strip()
    if rel.endswith(".html"):
        t = html_title(text)
        if t:
            return f"HTML page: {t}"
    # Path-based fallback
    if rel.startswith("api/"):
        return "API module / router / app entry"
    if rel.startswith("core/"):
        return "Core logic"
    if rel.startswith("database/"):
        return "Database layer"
    if rel.startswith("ui/"):
        return "Frontend UI asset"
    if rel.startswith("scripts/"):
        return "Operational script"
    return "Unknown"


def main() -> None:
    files = walk_code_files()
    lines: list[str] = []
    lines.append("## PHASE 1 — Code Truth Report\n")
    lines.append(f"- Generated from repository tree at: `{ROOT}`\n")
    lines.append(f"- Code files scanned: **{len(files)}**\n")
    lines.append("\n---\n")

    for p in files:
        rel = p.relative_to(ROOT).as_posix()
        text = read_text(p)

        lines.append(f"### `{rel}`\n")
        lines.append(f"- **Purpose**: {purpose_from_text(rel, text)}\n")

        if text is None:
            lines.append("- **Key symbols**: Unknown (not readable as text)\n")
            lines.append("- **Side effects**: Unknown\n")
            lines.append("- **Dependencies**: Unknown\n")
            lines.append("- **Auth/permission checks**: Unknown\n")
            lines.append("\n")
            continue

        flags = evidence_flags(text)
        side_effects = []
        if flags["db"]:
            side_effects.append("Database access (evidence: SQLAlchemy/Alembic tokens)")
        if flags["network"]:
            side_effects.append("Network I/O (evidence: fetch/requests/httpx tokens)")
        if flags["filesystem"]:
            side_effects.append("Filesystem I/O (evidence: open/Path/os.makedirs tokens)")
        if not side_effects:
            side_effects.append("No obvious DB/network/filesystem side effects detected (heuristic)")

        # Key symbols
        if rel.endswith(".py"):
            syms = python_symbols(text)
            imps = python_imports(text)
            if syms:
                lines.append("- **Key functions/classes**:\n")
                for s in syms:
                    sig = f" {s.args}" if (s.kind == "function" and s.args) else ""
                    doc = f" — {s.doc.splitlines()[0].strip()}" if s.doc else ""
                    lines.append(f"  - `{s.kind} {s.name}{sig}`{doc}\n")
            else:
                lines.append("- **Key functions/classes**: Not present in repository (no top-level defs found)\n")
            if imps:
                lines.append("- **Dependencies (imports)**:\n")
                for imp in imps[:60]:
                    lines.append(f"  - `{imp}`\n")
                if len(imps) > 60:
                    lines.append(f"  - (… {len(imps) - 60} more)\n")
            else:
                lines.append("- **Dependencies (imports)**: Not present in repository.\n")

        elif rel.endswith(".js"):
            fnames = js_exports_heuristic(text)
            if fnames:
                lines.append("- **Key functions (heuristic)**:\n")
                for n in fnames[:80]:
                    lines.append(f"  - `{n}()`\n")
                if len(fnames) > 80:
                    lines.append(f"  - (… {len(fnames) - 80} more)\n")
            else:
                lines.append("- **Key functions (heuristic)**: Not present in repository.\n")

        elif rel.endswith(".html"):
            t = html_title(text) or "Unknown"
            refs = html_refs(text)
            lines.append(f"- **HTML title**: {t}\n")
            if refs["links"] or refs["scripts"]:
                lines.append("- **External refs**:\n")
                for href in refs["links"][:40]:
                    lines.append(f"  - link: `{href}`\n")
                for src in refs["scripts"][:40]:
                    lines.append(f"  - script: `{src}`\n")
            else:
                lines.append("- **External refs**: Not present in repository.\n")

        else:
            # css/sh/dockerfile
            lines.append("- **Key symbols**: Not applicable\n")

        lines.append("- **Side effects (heuristic)**:\n")
        for s in side_effects:
            lines.append(f"  - {s}\n")

        # Auth/permissions evidence
        if flags["security_terms"]:
            hits = sorted(set(m.group(0) for m in SECURITY_PAT.finditer(text)))[:25]
            lines.append("- **Auth/permission evidence (tokens)**:\n")
            for h in hits:
                lines.append(f"  - `{h}`\n")
        else:
            lines.append("- **Auth/permission checks**: Not present in repository (no security tokens found in file; heuristic)\n")

        # Error handling evidence
        err_hits = []
        if rel.endswith(".py"):
            if re.search(r"\btry:\b", text):
                err_hits.append("try/except blocks present")
            if re.search(r"raise\s+\w+", text):
                err_hits.append("raise statements present")
        if rel.endswith(".js"):
            if re.search(r"\btry\s*{", text):
                err_hits.append("try/catch blocks present")
            if re.search(r"\bthrow\b", text):
                err_hits.append("throw statements present")
        if err_hits:
            lines.append("- **Error handling (evidence)**:\n")
            for e in err_hits:
                lines.append(f"  - {e}\n")
        else:
            lines.append("- **Error handling**: Unknown / not detected (heuristic)\n")

        lines.append("\n---\n")

    OUT.write_text("".join(lines), encoding="utf-8")
    print(f"Wrote: {OUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()


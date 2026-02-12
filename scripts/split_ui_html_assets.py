#!/usr/bin/env python3
"""
Split a large UI HTML file into smaller assets: CSS + JS + HTML shell.

Usage:
  python3 scripts/split_ui_html_assets.py ui/chat.html
  python3 scripts/split_ui_html_assets.py ui/process-builder.html

Behavior:
- Creates ui/<name>.css from all <style> blocks found in <head>
- Creates ui/<name>.js  from the first inline <script>...</script> (no src=)
- Rewrites the HTML to reference the new assets:
    <link rel="stylesheet" href="/ui/<name>.css">
    <script src="/ui/<name>.js" defer></script>

This keeps runtime behavior identical (no bundler, no modules).
"""

from __future__ import annotations

import re
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def _extract_head_and_rest(html: str) -> tuple[str, str]:
    head_end = html.lower().find("</head>")
    if head_end == -1:
        raise RuntimeError("Could not find </head>")
    return html[: head_end + 7], html[head_end + 7 :]


def _extract_head_styles(head_html: str) -> tuple[str, list[str]]:
    styles: list[str] = []

    def _collect(m: re.Match[str]) -> str:
        styles.append(m.group(1))
        return ""

    head_wo = re.sub(
        r"<style>\s*([\s\S]*?)\s*</style>",
        _collect,
        head_html,
        flags=re.IGNORECASE,
    )
    return head_wo, styles


def _insert_css_link(head_html: str, href: str) -> str:
    link_tag = f'    <link rel="stylesheet" href="{href}">\n'

    # Insert after theme.css if present
    theme_css = '<link rel="stylesheet" href="/ui/theme.css">'
    idx = head_html.find(theme_css)
    if idx != -1:
        insert_at = idx + len(theme_css)
        return head_html[:insert_at] + "\n" + link_tag + head_html[insert_at:]

    # Otherwise before </head>
    return re.sub(r"</head>", link_tag + "</head>", head_html, flags=re.IGNORECASE, count=1)


def _extract_first_inline_script(full_html: str) -> tuple[str, str]:
    # First inline <script> without src=
    pattern = re.compile(
        r"<script(?![^>]*\bsrc\s*=)[^>]*>\s*([\s\S]*?)\s*</script>",
        re.IGNORECASE,
    )
    m = pattern.search(full_html)
    if not m:
        raise RuntimeError("Could not find an inline <script>...</script> block (no src=) to extract")
    js = m.group(1)
    # Replace with external include (defer to preserve DOMContentLoaded ordering)
    return full_html[: m.start()] + "__SCRIPT_REPLACER__" + full_html[m.end() :], js


def main() -> None:
    if len(sys.argv) != 2:
        raise SystemExit("Usage: python3 scripts/split_ui_html_assets.py ui/<file>.html")

    rel = sys.argv[1]
    html_path = (ROOT / rel).resolve()
    if not html_path.exists():
        raise RuntimeError(f"File not found: {rel}")
    if html_path.suffix.lower() != ".html":
        raise RuntimeError("Input must be an .html file")

    html = html_path.read_text(encoding="utf-8")
    name = html_path.stem
    css_path = html_path.with_name(f"{name}.css")
    js_path = html_path.with_name(f"{name}.js")

    head, rest = _extract_head_and_rest(html)
    head_wo_styles, styles = _extract_head_styles(head)
    if not styles:
        raise RuntimeError("No <style> blocks found in <head>")

    css_out = "\n\n/* === Extracted from {} === */\n\n".format(html_path.name).join(s.strip("\n") for s in styles).strip() + "\n"
    css_path.write_text(css_out, encoding="utf-8")

    # Insert CSS link and rebuild
    head_new = _insert_css_link(head_wo_styles, f"/ui/{css_path.name}")
    rebuilt = head_new + rest

    rebuilt2, js = _extract_first_inline_script(rebuilt)
    js_path.write_text(js.strip("\n") + "\n", encoding="utf-8")

    script_tag = f'    <script src="/ui/{js_path.name}" defer></script>'
    rebuilt2 = rebuilt2.replace("__SCRIPT_REPLACER__", script_tag, 1)

    # Light whitespace normalization
    rebuilt2 = re.sub(r"\n{4,}", "\n\n\n", rebuilt2)
    html_path.write_text(rebuilt2, encoding="utf-8")

    print("✅ Split complete:", rel)
    print(" - CSS:", css_path.relative_to(ROOT))
    print(" - JS: ", js_path.relative_to(ROOT))


if __name__ == "__main__":
    main()


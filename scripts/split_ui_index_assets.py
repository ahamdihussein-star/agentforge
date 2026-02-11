#!/usr/bin/env python3
"""
Split ui/index.html into smaller assets.

Why:
- ui/index.html became very large (inline CSS + huge inline JS).
- This increases AI/IDE editing cost and makes iteration slower.

What this does (safe, reversible):
- Creates/updates ui/index.legacy.html (backup of current ui/index.html)
- Extracts ALL <style>...</style> blocks in the HTML HEAD into ui/index.css
- Extracts the first inline <script>...</script> (the app script) into ui/index.js
- Rewrites ui/index.html to reference /ui/index.css and /ui/index.js (deferred)

Constraints:
- No functional changes intended; content is moved verbatim.
"""

from __future__ import annotations

import re
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
UI_DIR = ROOT / "ui"
INDEX_HTML = UI_DIR / "index.html"
LEGACY_HTML = UI_DIR / "index.legacy.html"
INDEX_CSS = UI_DIR / "index.css"
INDEX_JS = UI_DIR / "index.js"


def _extract_head_and_rest(html: str) -> tuple[str, str]:
    head_end = html.lower().find("</head>")
    if head_end == -1:
        raise RuntimeError("Could not find </head> in ui/index.html")
    head = html[: head_end + len("</head>")]
    rest = html[head_end + len("</head>") :]
    return head, rest


def _extract_all_head_styles(head_html: str) -> tuple[str, list[str]]:
    # Extract all <style> blocks in head (including any small embedded blocks).
    style_blocks: list[str] = []

    def _collect(m: re.Match[str]) -> str:
        style_blocks.append(m.group(1))
        return ""

    head_without_styles = re.sub(
        r"<style>\s*([\s\S]*?)\s*</style>",
        _collect,
        head_html,
        flags=re.IGNORECASE,
    )
    return head_without_styles, style_blocks


def _insert_css_link(head_html: str) -> str:
    # Insert after theme.css if present, else before </head>.
    link_tag = '    <link rel="stylesheet" href="/ui/index.css">\n'
    theme_css = '<link rel="stylesheet" href="/ui/theme.css">'
    idx = head_html.find(theme_css)
    if idx != -1:
        insert_at = idx + len(theme_css)
        return head_html[:insert_at] + "\n" + link_tag + head_html[insert_at:]

    # Fallback: insert before </head>
    return re.sub(
        r"</head>",
        link_tag + "</head>",
        head_html,
        flags=re.IGNORECASE,
        count=1,
    )


def _extract_inline_app_script(full_html: str) -> tuple[str, str]:
    """
    Extract the first inline <script>...</script> where the opening tag has no src=.
    Returns: (html_without_script, script_contents)
    """
    # Match <script> ... </script> but NOT <script src="...">
    pattern = re.compile(
        r"<script(?![^>]*\bsrc\s*=)[^>]*>\s*([\s\S]*?)\s*</script>",
        re.IGNORECASE,
    )
    m = pattern.search(full_html)
    if not m:
        raise RuntimeError("Could not find an inline <script>...</script> block to extract")
    script_contents = m.group(1)
    html_without = full_html[: m.start()] + '<script src="/ui/index.js" defer></script>' + full_html[m.end() :]
    return html_without, script_contents


def main() -> None:
    if not INDEX_HTML.exists():
        raise RuntimeError(f"Missing file: {INDEX_HTML}")

    original = INDEX_HTML.read_text(encoding="utf-8")

    # Backup first (always overwrite so it matches current state).
    LEGACY_HTML.write_text(original, encoding="utf-8")

    head, rest = _extract_head_and_rest(original)
    head_no_styles, styles = _extract_all_head_styles(head)
    if not styles:
        raise RuntimeError("No <style> blocks found in <head>; nothing to extract")

    # Write CSS (verbatim, concatenated in original order)
    css_out = "\n\n/* === Extracted from ui/index.html === */\n\n".join(s.strip("\n") for s in styles).strip()
    INDEX_CSS.write_text(css_out + "\n", encoding="utf-8")

    # Rebuild HTML with CSS link
    new_head = _insert_css_link(head_no_styles)
    rebuilt = new_head + rest

    # Extract inline app script into index.js and replace with src include
    rebuilt2, script_contents = _extract_inline_app_script(rebuilt)
    INDEX_JS.write_text(script_contents.strip("\n") + "\n", encoding="utf-8")

    # Normalize a bit of whitespace (avoid huge blank areas)
    rebuilt2 = re.sub(r"\n{4,}", "\n\n\n", rebuilt2)

    INDEX_HTML.write_text(rebuilt2, encoding="utf-8")

    print("✅ Split complete:")
    print(f" - Backup: {LEGACY_HTML.relative_to(ROOT)}")
    print(f" - CSS:    {INDEX_CSS.relative_to(ROOT)}")
    print(f" - JS:     {INDEX_JS.relative_to(ROOT)}")
    print(f" - HTML:   {INDEX_HTML.relative_to(ROOT)}")


if __name__ == "__main__":
    main()


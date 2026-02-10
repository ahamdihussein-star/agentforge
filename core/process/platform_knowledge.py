"""
Platform Knowledge Retrieval (RAG-lite)

Goal:
- Provide the LLM with grounded, platform-specific facts (shapes, rules, taxonomies)
  without bloating every prompt.

This implementation intentionally avoids external vector DB dependencies.
It uses a lightweight keyword/TF-IDF-ish scoring over a curated KB in docs/.

Later, this can be swapped with a real vector store retriever.
"""

from __future__ import annotations

import glob
import math
import os
import re
from dataclasses import dataclass
from functools import lru_cache
from typing import Dict, List, Optional, Tuple


STOP_WORDS = {
    # English
    "the", "a", "an", "is", "are", "was", "were", "be", "been", "being",
    "have", "has", "had", "do", "does", "did", "will", "would", "could",
    "should", "may", "might", "must", "shall", "can", "need",
    "to", "of", "in", "for", "on", "with", "at", "by", "from", "as",
    "and", "but", "if", "or", "because", "what", "which", "who", "this",
    "that", "i", "me", "my", "we", "our", "you", "your", "it", "its",
    # Common workflow terms (reduce over-weighting)
    "workflow", "process", "step", "node", "field", "fields", "form",
}


@dataclass(frozen=True)
class KBChunk:
    source: str
    text: str
    title: Optional[str] = None


def _repo_root() -> str:
    # core/process/platform_knowledge.py -> repo root is ../../
    here = os.path.abspath(os.path.dirname(__file__))
    return os.path.abspath(os.path.join(here, "..", ".."))


def _read_text(path: str) -> str:
    with open(path, "r", encoding="utf-8", errors="ignore") as f:
        return f.read()


def _extract_title(md: str) -> Optional[str]:
    # first Markdown H1 if present
    for line in md.splitlines():
        if line.startswith("# "):
            return line[2:].strip() or None
    return None


def _to_camel_key(s: str) -> str:
    s = (s or "").strip()
    if not s:
        return ""
    s = re.sub(r"[^A-Za-z0-9 _]", " ", s)
    s = re.sub(r"\s+", " ", s).strip()
    if not s:
        return ""
    parts = re.split(r"[_\s]+", s)
    parts = [p for p in parts if p]
    if not parts:
        return ""
    first = parts[0].lower()
    rest = "".join(p[:1].upper() + p[1:].lower() for p in parts[1:])
    key = first + rest
    if not re.match(r"^[A-Za-z]", key):
        key = "taxonomy" + key
    return key


def _chunk_markdown(md: str, chunk_chars: int = 1200, overlap_chars: int = 200) -> List[str]:
    """
    Chunk markdown by paragraphs while keeping chunks under chunk_chars.
    """
    paragraphs = [p.strip() for p in re.split(r"\n\s*\n", md) if p.strip()]
    chunks: List[str] = []
    buf: List[str] = []
    size = 0

    def flush():
        nonlocal buf, size
        if not buf:
            return
        txt = "\n\n".join(buf).strip()
        if txt:
            chunks.append(txt)
        # overlap tail
        if overlap_chars > 0 and txt:
            tail = txt[-overlap_chars:]
            buf = [tail]
            size = len(tail)
        else:
            buf = []
            size = 0

    for p in paragraphs:
        if size + len(p) + 2 > chunk_chars and buf:
            flush()
        buf.append(p)
        size += len(p) + 2
    flush()
    return chunks


def _tokenize(text: str) -> List[str]:
    words = re.findall(r"\b\w+\b", (text or "").lower())
    return [w for w in words if w not in STOP_WORDS and len(w) > 1]


def _score_chunks(query: str, chunks: List[KBChunk], top_k: int = 5) -> List[Tuple[KBChunk, float]]:
    query_words = _tokenize(query)
    if not query_words:
        query_words = re.findall(r"\b\w+\b", (query or "").lower())
    if not query_words:
        return []

    # IDF over chunks
    doc_count = len(chunks) or 1
    idf: Dict[str, float] = {}
    for w in query_words:
        docs_with_word = sum(1 for c in chunks if w in (c.text or "").lower())
        idf[w] = math.log((doc_count + 1) / (docs_with_word + 1)) + 1

    scored: List[Tuple[KBChunk, float]] = []
    for c in chunks:
        text_lower = (c.text or "").lower()
        text_words = re.findall(r"\b\w+\b", text_lower)
        text_word_count = len(text_words) if text_words else 1
        score = 0.0
        matched = 0
        for w in query_words:
            if w in text_lower:
                matched += 1
                tf = text_lower.count(w) / text_word_count
                score += tf * idf.get(w, 1.0)
        if matched == 0:
            continue
        coverage = matched / max(1, len(query_words))
        score *= (1.0 + coverage)
        if len(query_words) > 1 and " ".join(query_words) in text_lower:
            score *= 1.8
        scored.append((c, min(score, 10.0)))

    scored.sort(key=lambda t: t[1], reverse=True)
    return scored[:top_k]


@lru_cache(maxsize=1)
def load_platform_kb_chunks() -> List[KBChunk]:
    """
    Load curated KB docs from docs/ and chunk them.
    Cached for process lifetime.
    """
    root = _repo_root()
    patterns = [
        os.path.join(root, "docs", "PROCESS_BUILDER_KB_*.md"),
    ]
    files: List[str] = []
    for p in patterns:
        files.extend(glob.glob(p))
    files = sorted(set(files))

    chunks: List[KBChunk] = []
    for path in files:
        try:
            md = _read_text(path)
        except OSError:
            continue
        title = _extract_title(md)
        for part in _chunk_markdown(md):
            chunks.append(KBChunk(source=os.path.relpath(path, root), text=part, title=title))
    return chunks


@lru_cache(maxsize=1)
def load_safe_taxonomies() -> Dict[str, List[str]]:
    """
    Parse docs/PROCESS_BUILDER_KB_TAXONOMIES.md into a structured taxonomy map.
    Keys are lowerCamelCase taxonomy IDs.
    """
    root = _repo_root()
    path = os.path.join(root, "docs", "PROCESS_BUILDER_KB_TAXONOMIES.md")
    try:
        md = _read_text(path)
    except OSError:
        return {}

    current: Optional[str] = None
    out: Dict[str, List[str]] = {}
    for raw in md.splitlines():
        line = raw.strip()
        m = re.match(r"^###\s+(.+)$", line)
        if m:
            current = _to_camel_key(m.group(1).strip())
            if current and current not in out:
                out[current] = []
            continue
        if current:
            m2 = re.match(r"^- (.+)$", line)
            if m2:
                opt = m2.group(1).strip()
                if opt:
                    out[current].append(opt)
    # Deduplicate while preserving order
    for k, v in list(out.items()):
        seen = set()
        deduped = []
        for opt in v:
            if opt in seen:
                continue
            seen.add(opt)
            deduped.append(opt)
        out[k] = deduped
    return out


def retrieve_platform_knowledge(
    query: str,
    top_k: int = 6,
    max_chars: int = 5000,
) -> str:
    """
    Retrieve a compact, grounded knowledge context for the LLM prompt.
    Returns a markdown string with top chunks.
    """
    chunks = load_platform_kb_chunks()
    scored = _score_chunks(query, chunks, top_k=top_k)
    if not scored:
        return ""

    out_parts: List[str] = []
    used = 0
    for c, _s in scored:
        header = f"### {c.title or 'KB'} — {c.source}"
        body = c.text.strip()
        block = f"{header}\n{body}\n"
        if used + len(block) > max_chars and out_parts:
            break
        out_parts.append(block)
        used += len(block)

    return "\n".join(out_parts).strip()


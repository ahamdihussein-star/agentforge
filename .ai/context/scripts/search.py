#!/usr/bin/env python3
"""
Search indexed code and documentation
Usage: python search.py "your query"
"""

import json
import numpy as np
from pathlib import Path
from typing import List, Dict
import sys
import os

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent.parent.parent))

try:
    from openai import OpenAI
    OPENAI_AVAILABLE = True
except ImportError:
    OPENAI_AVAILABLE = False
    print("⚠️  OpenAI not available. Install with: pip install openai")

class ContextSearch:
    def __init__(self):
        if OPENAI_AVAILABLE:
            self.client = OpenAI()
        self.embeddings_path = Path(__file__).parent.parent / "embeddings"
    
    def search_code(self, query: str, top_k: int = 10) -> List[Dict]:
        """Search code index"""
        return self._search("code", query, top_k)
    
    def search_docs(self, query: str, top_k: int = 10) -> List[Dict]:
        """Search documentation index"""
        return self._search("docs", query, top_k)
    
    def _search(self, index_name: str, query: str, top_k: int) -> List[Dict]:
        """Generic search"""
        # Load index
        index_file = self.embeddings_path / f"{index_name}.json"
        if not index_file.exists():
            print(f"⚠️  Index {index_name} not found. Run indexing first:")
            print(f"   python .ai/context/scripts/index_all.py")
            return []
        
        index_data = json.loads(index_file.read_text())
        chunks = index_data['chunks']
        
        if not OPENAI_AVAILABLE:
            print("⚠️  Cannot search without OpenAI. Returning first 5 chunks.")
            return chunks[:5]
        
        # Generate query embedding
        query_embedding = self.client.embeddings.create(
            model=index_data['model'],
            input=[query]
        ).data[0].embedding
        
        # Calculate similarities
        similarities = []
        for chunk in chunks:
            similarity = self._cosine_similarity(
                query_embedding,
                chunk['embedding']
            )
            similarities.append((similarity, chunk))
        
        # Sort and return top-k
        similarities.sort(reverse=True, key=lambda x: x[0])
        
        results = []
        for score, chunk in similarities[:top_k]:
            results.append({
                'score': score,
                'file': chunk['file'],
                'lines': f"{chunk['start_line']}-{chunk['end_line']}",
                'context': chunk.get('context', ''),
                'content': chunk['content'][:200] + '...'
            })
        
        return results
    
    def _cosine_similarity(self, a: List[float], b: List[float]) -> float:
        """Calculate cosine similarity"""
        a = np.array(a)
        b = np.array(b)
        return float(np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b)))

def main():
    if len(sys.argv) < 2:
        print("Usage: python search.py 'your query'")
        print("Example: python search.py 'process execution with approval'")
        sys.exit(1)
    
    query = ' '.join(sys.argv[1:])
    
    searcher = ContextSearch()
    
    print(f"\n🔍 Searching code for: '{query}'\n")
    results = searcher.search_code(query)
    
    if not results:
        print("No results found.")
        return
    
    for i, result in enumerate(results, 1):
        print(f"{i}. {result['file']}:{result['lines']} (score: {result['score']:.3f})")
        if result['context']:
            print(f"   Context: {result['context']}")
        print(f"   Preview: {result['content']}\n")

if __name__ == "__main__":
    main()

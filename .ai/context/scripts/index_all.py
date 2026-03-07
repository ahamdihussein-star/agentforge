#!/usr/bin/env python3
"""
Index codebase and documentation for RAG
Run this after major changes or initially
"""

import os
import json
import hashlib
import yaml
from pathlib import Path
from typing import List, Dict
from datetime import datetime
import sys

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent.parent))

try:
    from openai import OpenAI
    OPENAI_AVAILABLE = True
except ImportError:
    OPENAI_AVAILABLE = False
    print("⚠️  OpenAI not available. Install with: pip install openai")
    sys.exit(1)

class CodeIndexer:
    def __init__(self):
        self.client = OpenAI()
        self.base_path = Path(__file__).parent.parent.parent.parent
        self.config_path = Path(__file__).parent.parent / "config.yaml"
        self.embeddings_path = Path(__file__).parent.parent / "embeddings"
        self.embeddings_path.mkdir(parents=True, exist_ok=True)
        
        # Load config
        with open(self.config_path) as f:
            self.config = yaml.safe_load(f)
    
    def index_all(self):
        """Index both code and documentation"""
        print("🚀 Starting full indexing...\n")
        
        # Index code
        print("📝 Indexing code...")
        self.index_code()
        
        # Index documentation
        print("\n📚 Indexing documentation...")
        self.index_docs()
        
        print("\n✅ Indexing complete!")
        print(f"📊 Indexes saved to: {self.embeddings_path}")
    
    def index_code(self):
        """Index code files"""
        files = self._get_files('code')
        chunks = []
        
        for file_path in files:
            file_chunks = self._chunk_code_file(file_path)
            chunks.extend(file_chunks)
        
        print(f"   Created {len(chunks)} chunks from {len(files)} files")
        
        if chunks:
            embeddings = self._generate_embeddings(chunks)
            self._save_index("code", chunks, embeddings)
    
    def index_docs(self):
        """Index documentation files"""
        files = self._get_files('documentation')
        chunks = []
        
        for file_path in files:
            file_chunks = self._chunk_doc_file(file_path)
            chunks.extend(file_chunks)
        
        print(f"   Created {len(chunks)} chunks from {len(files)} files")
        
        if chunks:
            embeddings = self._generate_embeddings(chunks)
            self._save_index("docs", chunks, embeddings)
    
    def _get_files(self, category: str) -> List[Path]:
        """Get files to index"""
        include_patterns = self.config['indexing'][category]['include']
        exclude_patterns = self.config['indexing'][category]['exclude']
        
        files = []
        for pattern in include_patterns:
            files.extend(self.base_path.glob(pattern))
        
        # Filter excludes
        filtered = []
        for f in files:
            if f.is_file():
                rel_path = f.relative_to(self.base_path)
                if not any(rel_path.match(pattern) for pattern in exclude_patterns):
                    filtered.append(f)
        
        return filtered
    
    def _chunk_code_file(self, file_path: Path) -> List[Dict]:
        """Chunk a code file intelligently"""
        try:
            content = file_path.read_text(encoding='utf-8')
        except:
            return []
        
        chunks = []
        lines = content.split('\n')
        
        current_chunk = []
        current_context = ""
        
        for i, line in enumerate(lines, 1):
            # Detect function/class definitions
            stripped = line.strip()
            if stripped.startswith(('def ', 'class ', 'async def ')):
                if current_chunk:
                    chunks.append(self._create_chunk(
                        file_path, current_chunk, current_context, 'code'
                    ))
                current_chunk = []
                current_context = stripped
            
            current_chunk.append((i, line))
            
            # Max chunk size
            if len(current_chunk) > 100:
                chunks.append(self._create_chunk(
                    file_path, current_chunk, current_context, 'code'
                ))
                current_chunk = []
        
        # Save last chunk
        if current_chunk:
            chunks.append(self._create_chunk(
                file_path, current_chunk, current_context, 'code'
            ))
        
        return chunks
    
    def _chunk_doc_file(self, file_path: Path) -> List[Dict]:
        """Chunk a documentation file by sections"""
        try:
            content = file_path.read_text(encoding='utf-8')
        except:
            return []
        
        chunks = []
        lines = content.split('\n')
        
        current_chunk = []
        current_heading = ""
        
        for i, line in enumerate(lines, 1):
            # Detect markdown headings
            if line.startswith('#'):
                if current_chunk:
                    chunks.append(self._create_chunk(
                        file_path, current_chunk, current_heading, 'docs'
                    ))
                current_chunk = []
                current_heading = line.strip()
            
            current_chunk.append((i, line))
            
            # Max chunk size for docs
            if len(current_chunk) > 50:
                chunks.append(self._create_chunk(
                    file_path, current_chunk, current_heading, 'docs'
                ))
                current_chunk = []
        
        # Save last chunk
        if current_chunk:
            chunks.append(self._create_chunk(
                file_path, current_chunk, current_heading, 'docs'
            ))
        
        return chunks
    
    def _create_chunk(self, file_path: Path, lines: List, context: str, chunk_type: str) -> Dict:
        """Create a chunk dictionary"""
        rel_path = file_path.relative_to(self.base_path)
        content = '\n'.join([l[1] for l in lines])
        
        return {
            'file': str(rel_path),
            'start_line': lines[0][0],
            'end_line': lines[-1][0],
            'content': content,
            'context': context,
            'type': chunk_type
        }
    
    def _generate_embeddings(self, chunks: List[Dict]) -> List[List[float]]:
        """Generate embeddings using OpenAI"""
        print("   🧠 Generating embeddings...")
        
        texts = []
        for chunk in chunks:
            text = f"File: {chunk['file']}\n"
            if chunk['context']:
                text += f"Context: {chunk['context']}\n"
            text += f"\n{chunk['content']}"
            texts.append(text)
        
        embeddings = []
        batch_size = 100
        
        for i in range(0, len(texts), batch_size):
            batch = texts[i:i+batch_size]
            response = self.client.embeddings.create(
                model=self.config['embeddings']['model'],
                input=batch
            )
            embeddings.extend([item.embedding for item in response.data])
            print(f"      Processed {min(i+batch_size, len(texts))}/{len(texts)} chunks")
        
        return embeddings
    
    def _save_index(self, name: str, chunks: List[Dict], embeddings: List[List[float]]):
        """Save index to disk"""
        index_file = self.embeddings_path / f"{name}.json"
        
        for chunk, embedding in zip(chunks, embeddings):
            chunk['embedding'] = embedding
            chunk['hash'] = hashlib.md5(chunk['content'].encode()).hexdigest()
        
        with open(index_file, 'w') as f:
            json.dump({
                'chunks': chunks,
                'updated_at': datetime.utcnow().isoformat(),
                'total_chunks': len(chunks),
                'model': self.config['embeddings']['model']
            }, f, indent=2)
        
        self._update_metadata(name, len(chunks))
        print(f"   ✅ Saved {name} index: {len(chunks)} chunks")
    
    def _update_metadata(self, index_name: str, chunk_count: int):
        """Update metadata file"""
        metadata_file = self.embeddings_path / "metadata.json"
        
        if metadata_file.exists():
            metadata = json.loads(metadata_file.read_text())
        else:
            metadata = {}
        
        metadata[index_name] = {
            'updated_at': datetime.utcnow().isoformat(),
            'chunk_count': chunk_count
        }
        
        metadata_file.write_text(json.dumps(metadata, indent=2))

if __name__ == "__main__":
    indexer = CodeIndexer()
    indexer.index_all()

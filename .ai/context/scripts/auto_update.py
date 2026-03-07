#!/usr/bin/env python3
"""
Auto-update RAG index for changed files
Called by git hooks or manually
"""

import subprocess
import sys
from pathlib import Path
from index_all import CodeIndexer

def get_changed_files():
    """Get files changed in last commit"""
    try:
        result = subprocess.run(
            ['git', 'diff', '--name-only', 'HEAD~1', 'HEAD'],
            capture_output=True,
            text=True,
            check=True
        )
        return result.stdout.strip().split('\n')
    except:
        return []

def should_reindex(changed_files):
    """Check if any changed files require reindexing"""
    code_patterns = ['.py']
    doc_patterns = ['.md']
    
    has_code_changes = any(
        any(f.endswith(ext) for ext in code_patterns)
        for f in changed_files
    )
    
    has_doc_changes = any(
        any(f.endswith(ext) for ext in doc_patterns)
        for f in changed_files
    )
    
    return has_code_changes, has_doc_changes

def main():
    print("🔄 Checking for changes...")
    
    changed_files = get_changed_files()
    
    if not changed_files or changed_files == ['']:
        print("   No changes detected")
        return
    
    has_code, has_docs = should_reindex(changed_files)
    
    if not has_code and not has_docs:
        print("   No indexable files changed")
        return
    
    print(f"   Found changes: code={has_code}, docs={has_docs}")
    print("\n🔄 Re-indexing...")
    
    indexer = CodeIndexer()
    
    if has_code:
        print("\n📝 Re-indexing code...")
        indexer.index_code()
    
    if has_docs:
        print("\n📚 Re-indexing documentation...")
        indexer.index_docs()
    
    print("\n✅ Auto-update complete!")

if __name__ == "__main__":
    main()

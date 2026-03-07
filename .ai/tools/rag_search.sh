#!/bin/bash
# Quick RAG search from terminal
# Usage: ./rag_search.sh "your query"

if [ -z "$1" ]; then
    echo "Usage: ./rag_search.sh 'your query'"
    exit 1
fi

python .ai/context/scripts/search.py "$@"

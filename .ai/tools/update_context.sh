#!/bin/bash
# Manual context update
# Usage: ./update_context.sh

echo "🔄 Updating AI context..."
python .ai/context/scripts/index_all.py
echo "✅ Context updated!"

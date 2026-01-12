#!/bin/bash
# COMPREHENSIVE Database Check - Run Before ANY Commit
# This script checks EVERYTHING we've learned from past issues

set -e

echo "🔬 COMPREHENSIVE DATABASE CHECK"
echo "================================"
echo ""

ERRORS=0
MODELS_DIR="database/models"

# Issue #1: Check for 'metadata' column
echo "🔍 Issue #1: Checking for reserved 'metadata'..."
if grep -r "metadata = Column" "$MODELS_DIR" | grep -v "user_metadata" | grep -v "extra_metadata" | grep -v "custom_metadata" | grep -v "^#"; then
    echo "❌ ERROR: Found 'metadata' column (reserved word)"
    ERRORS=$((ERRORS + 1))
else
    echo "✅ Pass"
fi

# Issue #6: Check for PostgreSQL enum usage
echo "🔍 Issue #6: Checking for PostgreSQL enum..."
if grep -r "SQLEnum\|Enum as SQLEnum" "$MODELS_DIR" | grep -v "^#" | grep "Column.*SQLEnum"; then
    echo "⚠️  WARNING: Consider using String instead of PostgreSQL enum"
fi
echo "✅ Pass"

# Issue #7: Check for PostgreSQL-specific imports
echo "🔍 Issue #7: Checking for PostgreSQL-specific imports..."
if grep -r "from sqlalchemy.dialects.postgresql" "$MODELS_DIR" | grep -v "^#"; then
    echo "❌ ERROR: Found PostgreSQL-specific imports"
    echo "   Use: from ..types import UUID, JSON, JSONArray"
    grep -r "from sqlalchemy.dialects.postgresql" "$MODELS_DIR" | grep -v "^#"
    ERRORS=$((ERRORS + 1))
else
    echo "✅ Pass"
fi

# Check for ARRAY usage
echo "🔍 Checking for ARRAY usage..."
if grep -r "ARRAY(" "$MODELS_DIR" | grep -v "^#" | grep -v "JSONArray"; then
    echo "❌ ERROR: Found ARRAY usage (PostgreSQL-specific)"
    echo "   Use: JSONArray"
    grep -r "ARRAY(" "$MODELS_DIR" | grep -v "^#" | grep -v "JSONArray"
    ERRORS=$((ERRORS + 1))
else
    echo "✅ Pass"
fi

# Check for UUID(as_uuid=True)
echo "🔍 Checking for UUID(as_uuid=True)..."
if grep -r "UUID(as_uuid=True)" "$MODELS_DIR" | grep -v "^#"; then
    echo "❌ ERROR: Found UUID(as_uuid=True) (PostgreSQL-specific)"
    echo "   Use: UUID (from ..types)"
    grep -r "UUID(as_uuid=True)" "$MODELS_DIR" | grep -v "^#"
    ERRORS=$((ERRORS + 1))
else
    echo "✅ Pass"
fi

# Check for INET usage
echo "🔍 Checking for INET usage..."
if grep -r "Column(INET" "$MODELS_DIR" | grep -v "^#"; then
    echo "❌ ERROR: Found INET usage (PostgreSQL-specific)"
    echo "   Use: String(45) for IP addresses"
    grep -r "Column(INET" "$MODELS_DIR" | grep -v "^#"
    ERRORS=$((ERRORS + 1))
else
    echo "✅ Pass"
fi

# Check for JSONB direct usage
echo "🔍 Checking for JSONB usage..."
if grep -r "from.*JSONB" "$MODELS_DIR" | grep -v "JSON as JSONB" | grep -v "JSON, JSONB" | grep -v "^#" | grep -v "JSONB = JSON"; then
    echo "⚠️  WARNING: Check JSONB import pattern"
    grep -r "from.*JSONB" "$MODELS_DIR" | grep -v "JSON as JSONB" | grep -v "^#" | grep -v "JSONB = JSON"
fi
echo "✅ Pass"

# Check import consistency
echo "🔍 Checking import consistency..."
for file in "$MODELS_DIR"/*.py; do
    if [ "$(basename "$file")" != "__init__.py" ]; then
        # Check if uses Column(JSON but doesn't import JSON
        if grep -q "Column(JSON" "$file" && ! grep -q "import.*JSON" "$file" && ! grep -q "^JSON = " "$file"; then
            echo "❌ ERROR: $(basename $file) uses JSON but doesn't import it"
            ERRORS=$((ERRORS + 1))
        fi
    fi
done
echo "✅ Pass"

echo ""
echo "================================"
if [ $ERRORS -gt 0 ]; then
    echo "❌ VALIDATION FAILED: $ERRORS errors"
    echo ""
    echo "🛑 COMMIT BLOCKED"
    echo "📚 See: database/COMMON_ISSUES.md"
    echo ""
    echo "🔍 Common fixes:"
    echo "   - Replace 'metadata' with 'extra_metadata'"
    echo "   - Use 'from ..types import UUID, JSON, JSONArray'"
    echo "   - Use String(45) for IP addresses"
    echo "   - Always test imports before committing"
    exit 1
else
    echo "✅ ALL CHECKS PASSED"
    echo "🚀 Safe to commit!"
    exit 0
fi


#!/bin/bash
# Pre-commit validation for database changes
# Run this before committing database model changes

echo "🔍 Database Models Validation"
echo "=============================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

ERRORS=0
WARNINGS=0

# Check 1: Reserved word 'metadata'
echo "1️⃣  Checking for reserved word 'metadata'..."
if grep -r "metadata = Column" database/models/ --exclude="*.pyc" 2>/dev/null | grep -v "user_metadata" | grep -v "extra_metadata" | grep -v "custom_metadata"; then
    echo -e "${RED}❌ ERROR: Found 'metadata = Column' (reserved by SQLAlchemy)${NC}"
    echo "   Use: extra_metadata, user_metadata, or custom_data instead"
    ERRORS=$((ERRORS + 1))
else
    echo -e "${GREEN}✅ No 'metadata' column found${NC}"
fi
echo ""

# Check 2: Other common reserved words
echo "2️⃣  Checking for other reserved words..."
FOUND_RESERVED=false
if grep -r "type = Column(String)" database/models/ --exclude="*.pyc" 2>/dev/null; then
    echo -e "${YELLOW}⚠️  WARNING: Found 'type = Column(String)' - consider using Enum${NC}"
    WARNINGS=$((WARNINGS + 1))
    FOUND_RESERVED=true
fi

if ! $FOUND_RESERVED; then
    echo -e "${GREEN}✅ No other reserved words found${NC}"
fi
echo ""

# Check 3: ForeignKey without use_alter
echo "3️⃣  Checking ForeignKey definitions..."
if grep -r "ForeignKey(" database/models/ --exclude="*.pyc" 2>/dev/null | grep -v "use_alter=True" | grep -v "#"; then
    echo -e "${YELLOW}⚠️  WARNING: ForeignKey without use_alter=True${NC}"
    echo "   May cause circular dependency issues"
    WARNINGS=$((WARNINGS + 1))
else
    echo -e "${GREEN}✅ ForeignKey definitions look good${NC}"
fi
echo ""

# Check 4: Relationships without ForeignKeys (only active relationships)
echo "4️⃣  Checking for relationships..."
# Count relationship usages (not imports, not comments)
ACTIVE_RELS=$(grep -r "relationship(" database/models/*.py 2>/dev/null | grep -v "from sqlalchemy" | grep -v "import relationship" | sed 's/.*://; s/^[[:space:]]*//' | grep -v "^#" | wc -l | tr -d ' ')
ACTIVE_FKS=$(grep -r "ForeignKey(" database/models/*.py 2>/dev/null | grep -v "from sqlalchemy" | grep -v "import ForeignKey" | sed 's/.*://; s/^[[:space:]]*//' | grep -v "^#" | wc -l | tr -d ' ')

if [ "$ACTIVE_RELS" -gt 0 ] && [ "$ACTIVE_FKS" -eq 0 ]; then
    echo -e "${RED}❌ ERROR: Found active relationships without ForeignKeys${NC}"
    grep -r "relationship(" database/models/*.py 2>/dev/null | grep -v "from sqlalchemy" | grep -v "import relationship" | sed 's/^[[:space:]]*//' | grep -v "^#"
    ERRORS=$((ERRORS + 1))
elif [ "$ACTIVE_RELS" -eq 0 ] && [ "$ACTIVE_FKS" -eq 0 ]; then
    echo -e "${YELLOW}⚠️  NOTE: No ForeignKeys or Relationships (temporary workaround)${NC}"
else
    echo -e "${GREEN}✅ Relationships look consistent (Active Rels: $ACTIVE_RELS, FKs: $ACTIVE_FKS)${NC}"
fi
echo ""

# Check 5: UTC timestamps
echo "5️⃣  Checking timestamp usage..."
if grep -r "datetime.now()" database/models/ --exclude="*.pyc" 2>/dev/null; then
    echo -e "${YELLOW}⚠️  WARNING: Found datetime.now() - should use datetime.utcnow()${NC}"
    WARNINGS=$((WARNINGS + 1))
else
    echo -e "${GREEN}✅ Using UTC timestamps${NC}"
fi
echo ""

# Check 6: Index naming
echo "6️⃣  Checking index definitions..."
if grep -r "Index(" database/models/ --exclude="*.pyc" 2>/dev/null | grep -v "Index('idx_" | grep "Index("; then
    echo -e "${YELLOW}⚠️  WARNING: Index without explicit name${NC}"
    echo "   Consider adding explicit index names: Index('idx_table_column', ...)"
    WARNINGS=$((WARNINGS + 1))
else
    echo -e "${GREEN}✅ Index definitions look good${NC}"
fi
echo ""

# Check 7: Migration scripts - UPSERT pattern
echo "7️⃣  Checking migration scripts for UPSERT pattern..."
if [ -d "scripts" ] && ls scripts/migrate*.py 1> /dev/null 2>&1; then
    MISSING_UPSERT=false
    for file in scripts/migrate*.py; do
        # Check if migration uses filter_by(id=...) without checking other unique fields
        if grep -q "filter_by(id=" "$file" 2>/dev/null; then
            # Check if it also uses filter() with OR for unique constraints
            if ! grep -q "\.filter(" "$file" 2>/dev/null || ! grep -q "|" "$file" 2>/dev/null; then
                echo -e "${YELLOW}⚠️  WARNING: $file may not check all unique constraints${NC}"
                echo "   Ensure migration checks: (Model.id == x) | (Model.unique_field == y)"
                WARNINGS=$((WARNINGS + 1))
                MISSING_UPSERT=true
            fi
        fi
    done
    
    if ! $MISSING_UPSERT; then
        echo -e "${GREEN}✅ Migration scripts use proper UPSERT pattern${NC}"
    fi
else
    echo -e "${GREEN}✅ No migration scripts to check${NC}"
fi
echo ""

# Check 8: Database-agnostic imports
echo "8️⃣  Checking for database-agnostic imports..."
if grep -r "from sqlalchemy.dialects.postgresql" "$MODELS_DIR" 2>/dev/null | grep -v "^#"; then
    echo -e "${RED}❌ ERROR: Found PostgreSQL-specific imports${NC}"
    echo "   Use: from ..types import UUID, JSON, JSONArray"
    grep -r "from sqlalchemy.dialects.postgresql" "$MODELS_DIR" 2>/dev/null | grep -v "^#"
    ERRORS=$((ERRORS + 1))
else
    echo -e "${GREEN}✅ All imports are database-agnostic${NC}"
fi
echo ""

# Check 9: Import consistency (JSON must be imported if used)
echo "9️⃣  Checking import consistency..."
IMPORT_ERRORS=0
for file in "$MODELS_DIR"/*.py; do
    if [ "$(basename "$file")" != "__init__.py" ]; then
        # Check if file uses Column(JSON but doesn't import JSON
        if grep -q "Column(JSON" "$file" 2>/dev/null; then
            if ! grep -q "from.*import.*JSON" "$file" 2>/dev/null && ! grep -q "^JSON = " "$file" 2>/dev/null; then
                echo -e "${RED}❌ ERROR: $(basename $file) uses JSON but doesn't import it${NC}"
                ERRORS=$((ERRORS + 1))
                IMPORT_ERRORS=1
            fi
        fi
    fi
done

if [ "$IMPORT_ERRORS" -eq 0 ]; then
    echo -e "${GREEN}✅ All imports are consistent${NC}"
fi
echo ""

# Summary
echo "=============================="
echo "📊 Validation Summary:"
echo "   Errors: $ERRORS"
echo "   Warnings: $WARNINGS"
echo ""

if [ $ERRORS -gt 0 ]; then
    echo -e "${RED}❌ VALIDATION FAILED - Please fix errors before committing${NC}"
    echo ""
    echo "💡 Tips:"
    echo "   1. Read database/COMMON_ISSUES.md"
    echo "   2. Check .cursorrules for database rules"
    echo "   3. Test locally: python database/init_db.py"
    exit 1
elif [ $WARNINGS -gt 0 ]; then
    echo -e "${YELLOW}⚠️  VALIDATION PASSED WITH WARNINGS${NC}"
    echo ""
    echo "You can proceed, but consider addressing warnings."
    exit 0
else
    echo -e "${GREEN}✅ ALL CHECKS PASSED!${NC}"
    echo ""
    echo "Safe to commit! 🚀"
    exit 0
fi


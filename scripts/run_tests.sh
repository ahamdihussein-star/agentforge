#!/bin/bash
#
# AgentForge Platform - Quick Test Runner
# ========================================
#
# This script runs the automated test suite with minimal configuration.
#
# Usage:
#   ./scripts/run_tests.sh
#
# Or with password:
#   ADMIN_PASSWORD='your_password' ./scripts/run_tests.sh
#
# Or for Railway deployment:
#   API_BASE_URL='https://your-app.railway.app' ADMIN_PASSWORD='your_password' ./scripts/run_tests.sh

set -e  # Exit on error

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
: ${API_BASE_URL:="http://localhost:8080"}
: ${ADMIN_EMAIL:="admin@agentforge.app"}
: ${ADMIN_PASSWORD:=""}

echo ""
echo "========================================"
echo "🧪 AgentForge Test Runner"
echo "========================================"
echo ""

# Check if Python is available
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}❌ Python 3 not found!${NC}"
    echo "   Please install Python 3 to run tests."
    exit 1
fi

# Check if password is set
if [ -z "$ADMIN_PASSWORD" ]; then
    echo -e "${YELLOW}⚠️  ADMIN_PASSWORD not set${NC}"
    echo ""
    echo "   Some tests will be skipped."
    echo "   To run all tests, set the password:"
    echo ""
    echo -e "   ${BLUE}ADMIN_PASSWORD='your_password' ./scripts/run_tests.sh${NC}"
    echo ""
    read -p "   Continue anyway? (y/n) " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "   Cancelled."
        exit 0
    fi
fi

# Check if requests library is installed
if ! python3 -c "import requests" 2>/dev/null; then
    echo -e "${YELLOW}⚠️  'requests' library not found${NC}"
    echo "   Installing..."
    pip3 install requests --quiet
fi

# Run tests
echo ""
echo -e "${BLUE}Running automated tests...${NC}"
echo ""

export API_BASE_URL
export ADMIN_EMAIL
export ADMIN_PASSWORD

python3 scripts/test_platform.py

# Capture exit code
EXIT_CODE=$?

echo ""

if [ $EXIT_CODE -eq 0 ]; then
    echo -e "${GREEN}✅ All tests passed!${NC}"
else
    echo -e "${RED}❌ Some tests failed (exit code: $EXIT_CODE)${NC}"
fi

echo ""

exit $EXIT_CODE


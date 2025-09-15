#!/bin/bash

# Pre-Push Check Script
# Run this before pushing to catch TypeScript and build errors early

echo "🔍 Running pre-push checks..."
echo "================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
  echo -e "${RED}❌ Error: package.json not found. Run this from the project root.${NC}"
  exit 1
fi

# Function to check command result
check_result() {
  if [ $1 -eq 0 ]; then
    echo -e "${GREEN}✅ $2 passed${NC}"
    return 0
  else
    echo -e "${RED}❌ $2 failed${NC}"
    return 1
  fi
}

FAILED=0

# 1. TypeScript type checking (fast)
echo ""
echo "1️⃣ Checking TypeScript types..."
npm run check:types > /dev/null 2>&1
check_result $? "TypeScript type check" || FAILED=1

# 2. ESLint check
echo ""
echo "2️⃣ Running ESLint..."
npm run lint > /dev/null 2>&1
check_result $? "ESLint" || FAILED=1

# 3. Optional: Full build check (slower but comprehensive)
echo ""
echo -e "${YELLOW}💡 Tip: Run 'npm run check:build' for a full build check (same as Railway)${NC}"

# Summary
echo ""
echo "================================"
if [ $FAILED -eq 0 ]; then
  echo -e "${GREEN}✅ All checks passed! Safe to push.${NC}"
  exit 0
else
  echo -e "${RED}❌ Some checks failed. Fix the issues before pushing.${NC}"
  echo ""
  echo "To see detailed errors, run:"
  echo "  npm run check:types  # For TypeScript errors"
  echo "  npm run lint         # For ESLint errors"
  echo "  npm run check:build  # For full build (same as Railway)"
  exit 1
fi
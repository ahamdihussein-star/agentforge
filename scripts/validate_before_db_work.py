#!/usr/bin/env python3
"""
MANDATORY Pre-Work Validation Script
This script MUST be run before ANY database-related work.
It ensures that recurring patterns are reviewed to prevent repeated mistakes.
"""
import sys
import os
from datetime import datetime

COMMON_ISSUES_FILE = 'database/COMMON_ISSUES.md'
VALIDATION_LOG = '.ai_validation_log.txt'

def check_common_issues_exists():
    """Check if COMMON_ISSUES.md exists"""
    if not os.path.exists(COMMON_ISSUES_FILE):
        print(f"❌ ERROR: {COMMON_ISSUES_FILE} not found!")
        return False
    return True

def get_recurring_patterns():
    """Extract recurring patterns from COMMON_ISSUES.md"""
    with open(COMMON_ISSUES_FILE, 'r') as f:
        content = f.read()
    
    # Find RECURRING PATTERNS section
    if '## 🚨 **RECURRING PATTERNS' not in content:
        print("⚠️  WARNING: RECURRING PATTERNS section not found!")
        return []
    
    # Extract pattern titles
    patterns = []
    lines = content.split('\n')
    in_patterns_section = False
    
    for line in lines:
        if '## 🚨 **RECURRING PATTERNS' in line:
            in_patterns_section = True
            continue
        if in_patterns_section:
            if line.startswith('## ') and 'RECURRING PATTERNS' not in line:
                break  # End of section
            if '### 🔴 **Pattern #' in line:
                patterns.append(line.strip())
    
    return patterns

def display_patterns(patterns):
    """Display patterns and require acknowledgment"""
    print("\n" + "="*80)
    print("🚨 MANDATORY: Review Recurring Patterns Before Database Work")
    print("="*80)
    print("\nThe following patterns MUST be avoided:\n")
    
    for i, pattern in enumerate(patterns, 1):
        print(f"  {i}. {pattern.replace('### 🔴 **', '').replace('**', '')}")
    
    print("\n" + "="*80)
    print("CRITICAL QUESTION:")
    print("Have you reviewed ALL patterns in database/COMMON_ISSUES.md?")
    print("="*80)
    
    # Require explicit acknowledgment
    response = input("\nType 'YES, I REVIEWED ALL PATTERNS' to continue: ").strip()
    
    if response != "YES, I REVIEWED ALL PATTERNS":
        print("\n❌ VALIDATION FAILED!")
        print("   You MUST review COMMON_ISSUES.md before proceeding.")
        print(f"   Read: {COMMON_ISSUES_FILE}")
        return False
    
    # Log the validation
    log_validation()
    print("\n✅ VALIDATION PASSED! You may proceed with database work.")
    return True

def log_validation():
    """Log that validation was performed"""
    with open(VALIDATION_LOG, 'a') as f:
        f.write(f"{datetime.utcnow().isoformat()} - RECURRING PATTERNS reviewed\n")

def main():
    """Main validation flow"""
    print("\n🔍 Pre-Database Work Validation")
    print("=" * 80)
    
    if not check_common_issues_exists():
        sys.exit(1)
    
    patterns = get_recurring_patterns()
    
    if not patterns:
        print("⚠️  No recurring patterns found. Proceeding with caution...")
        sys.exit(0)
    
    if not display_patterns(patterns):
        sys.exit(1)
    
    print("\n✅ All checks passed! Database work may proceed.\n")
    sys.exit(0)

if __name__ == '__main__':
    main()


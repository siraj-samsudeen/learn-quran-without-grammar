#!/bin/bash
# Pre-commit hook: validates lesson files before committing
# Install: cp tools/pre-commit-hook.sh .git/hooks/pre-commit && chmod +x .git/hooks/pre-commit

# Find which lessons were modified in this commit
MODIFIED_LESSONS=$(git diff --cached --name-only | grep '^lessons/' | sed 's|lessons/lesson-\([0-9]*\).*|lesson-\1|' | sort -u)

if [ -z "$MODIFIED_LESSONS" ]; then
    exit 0  # No lesson files modified
fi

FAILED=0

for lesson in $MODIFIED_LESSONS; do
    echo "🔍 Validating $lesson..."
    
    if [ -f "tools/validate-lesson-consistency.py" ]; then
        python3 tools/validate-lesson-consistency.py "$lesson"
        if [ $? -ne 0 ]; then
            echo "❌ Validation failed for $lesson"
            FAILED=1
        else
            echo "✅ $lesson passed validation"
        fi
    else
        echo "⚠️  validate-lesson-consistency.py not found, skipping validation"
    fi
done

if [ $FAILED -ne 0 ]; then
    echo ""
    echo "❌ Fix validation errors before committing."
    echo "   To bypass (emergency): git commit --no-verify"
    exit 1
fi

exit 0

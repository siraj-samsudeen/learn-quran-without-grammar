#!/bin/bash
# First-time setup: wire git to our tracked hooks and install Python deps.
# Idempotent — safe to re-run anytime.
set -e

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

# 1. Point git at our tracked hooks directory.
git config core.hooksPath tools/hooks
echo "✓ core.hooksPath → tools/hooks"

# 2. Create a project venv for hook dependencies (PEP 668 forbids system pip).
if [ ! -d tools/.venv ]; then
    python3 -m venv tools/.venv
    echo "✓ created tools/.venv"
fi

# 3. Install / update Python deps from requirements.txt.
tools/.venv/bin/pip install --quiet --upgrade pip
tools/.venv/bin/pip install --quiet -r tools/requirements.txt
echo "✓ installed tools/requirements.txt into tools/.venv"

# 4. Clean up any stale hook installed by the old copy-based method.
if [ -f .git/hooks/pre-commit ] && [ ! -L .git/hooks/pre-commit ]; then
    rm .git/hooks/pre-commit
    echo "✓ removed stale .git/hooks/pre-commit (now served from tools/hooks/)"
fi

echo ""
echo "✅ Hooks installed. Try: git commit (hooks run on your next lesson edit)."

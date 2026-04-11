#!/bin/bash
# Wrapper that runs validate-lesson-consistency.py inside the project venv.
# Called by both the pre-commit hook and the lesson-review-checklist skill,
# so there's one source of truth for how the validator is invoked.
set -e

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
VENV_PY="$REPO_ROOT/tools/.venv/bin/python3"

if [ ! -x "$VENV_PY" ]; then
    echo "❌ Project venv missing at tools/.venv/"
    echo "   Run: tools/install-hooks.sh"
    exit 2
fi

exec "$VENV_PY" "$REPO_ROOT/tools/validate-lesson-consistency.py" "$@"

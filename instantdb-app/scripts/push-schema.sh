#!/usr/bin/env bash
# Push instant.schema.ts to the live InstantDB app.
# Destructive: any schema-less data using attribute names that conflict
# with the typed schema will be orphaned. Run --status afterwards to
# confirm the entity list matches.
set -euo pipefail

cd "$(dirname "$0")/.."

# Use existing INSTANT_APP_ID env var if set; else hardcoded.
export INSTANT_APP_ID="${INSTANT_APP_ID:-b1c9a636-2a46-4be6-a055-16d6f2ebd233}"

echo "Pushing schema to App ID: $INSTANT_APP_ID"
echo "(Press Ctrl-C to abort; you have 5 seconds.)"
sleep 5

npx instant-cli@latest push schema

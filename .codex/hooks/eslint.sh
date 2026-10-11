#!/usr/bin/env bash
set -euo pipefail

# Consume the event payload so the hook protocol can complete cleanly.
cat >/dev/null

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

# Run ESLint only when a frontend file was changed by the tool call.
changed_files="$(
    {
        git -C "$repo_root" diff --name-only --diff-filter=ACM 2>/dev/null || true
        git -C "$repo_root" ls-files --others --exclude-standard 2>/dev/null || true
    } | grep '^frontend/' || true
)"

if [ -z "$changed_files" ]; then
    echo '{}'
    exit 0
fi

cd "$repo_root/frontend"
npm run lint

# PostToolUse accepts an empty JSON object when no feedback is required.
echo '{}'

#!/usr/bin/env bash
set -euo pipefail

# Consume the event payload so the hook protocol can complete cleanly.
cat >/dev/null

# Git Bash on Windows must be able to find gofmt.
command -v gofmt >/dev/null 2>&1 || { echo '{}'; exit 0; }

# Use a loop instead of mapfile: the system Bash in macOS does not support it.
while IFS= read -r file; do
    [ -f "$file" ] && gofmt -w "$file"
done < <(git diff --name-only --diff-filter=ACM -- 2>/dev/null | grep '\.go$' || true)

# PostToolUse accepts an empty JSON object when no feedback is required.
echo '{}'

---
name: product-code-review
description: Review mixed Go backend and Next.js frontend diffs, run applicable static checks, and report actionable P0-P3 findings using the product architecture checklist.
---

# Product code review

Use this skill when reviewing a commit, pull request, or working-tree diff in this product. It covers the independent `backend/` Go service and `frontend/` Next.js application. Do not modify production code while reviewing unless the user explicitly asks for fixes.

## Review workflow

1. Establish the review scope before inspecting behavior:
   - Resolve the commit under review. If the user names a commit, use it; otherwise use `HEAD` and state that assumption.
   - Read `git show --stat --oneline <commit>` and `git diff <commit>^ <commit>` (or the requested base range).
   - Record changed files and select checklist sections conditionally: backend for `backend/**`, frontend for `frontend/**`, and always security, correctness, tests, naming/dead-code, and the relevant architecture sections.
   - If the diff is empty or the commit cannot be resolved, stop and report that instead of reviewing unrelated code.
2. Run static checks before making code-review conclusions:

   ```powershell
   powershell.exe -ExecutionPolicy Bypass -File .codex/skills/product-code-review/scripts/run-static-checks.ps1 -Commit <commit> -BaseRef <commit>^
   ```

   The script runs only checks for touched modules. Use `-All` when the review explicitly covers the whole repository. Record failures as review evidence; do not hide them or call a review complete when a relevant check failed.
3. Read [references/review-checklist.md](references/review-checklist.md) and walk every applicable section. Use the checklist's good/bad signals as evidence prompts, not as a reason to invent findings.
4. Inspect the actual diff and surrounding code. Follow changed inputs to persistence, network, rendering, and error boundaries. Check both sides of API changes when backend and frontend are modified.
5. Report only actionable findings, ordered from P0 to P3. Each finding must include a file/line, impact, and smallest safe fix. Distinguish a confirmed defect from a recommendation.
6. End with the exact checks, blocking status, and reviewed sections. If there are no findings, say so explicitly and still report the verification results.

## Repository architecture

### Backend

- `cmd/` contains executable entrypoints only.
- `internal/app/` composes configuration, repositories, services, handlers, middleware, and server lifecycle.
- `internal/config/` owns environment/config parsing.
- Focused domain packages such as `internal/auth` and `internal/monitor` own domain models, services, repositories, and HTTP handlers for that domain.
- `internal/platform/` owns shared technical adapters such as PostgreSQL, migrations, file storage, and other infrastructure.
- `migrations/` contains versioned SQL migrations.

### Frontend

- `src/app/` contains Next.js App Router pages, layouts, and route-level composition.
- `src/features/` contains feature-specific UI, state, and API modules.
- `src/shared/` contains reusable infrastructure such as the API client.
- Server components are the default; `'use client'` is limited to browser state, effects, and event handlers.
- `.env.local` holds secrets; only browser-safe values may use `NEXT_PUBLIC_`.

The architecture is a review boundary: report a finding when a change crosses these layers without a concrete reason, duplicates an existing boundary, or puts business logic in composition/UI shells.

## Safety boundaries

- Do not expose secrets, credentials, tokens, or private configuration in review output.
- Do not treat a green static check as proof that behavior is correct or secure.
- Do not downgrade P0/P1 issues because they are outside the changed file if the diff creates the execution path.
- Do not request unrelated refactors; keep recommendations proportional to the reviewed change.

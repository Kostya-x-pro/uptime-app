# Product code-review checklist

Review only sections selected by the changed files, but always run the security, correctness, and dead-code checks for the diff.

## Priority model

- **P0 — Blocker:** exploitable security issue, secret exposure, data loss, authentication bypass, destructive migration error, production outage, or a defect that makes the changed critical flow unusable. Must be fixed before merge.
- **P1 — High:** incorrect business behavior, broken API contract, authorization gap, serious regression, unreliable data handling, or missing coverage for a critical path. Fix before merge unless explicitly accepted.
- **P2 — Medium:** maintainability or correctness risk with a bounded impact, missing edge-case handling, weak tests, architecture drift, or avoidable performance issue. Fix in the change or track immediately.
- **P3 — Low:** naming, minor duplication, readability, documentation, or stylistic improvement that does not affect behavior or safety.

Every finding must include priority, file and line, concrete impact, and a focused correction. Do not report hypothetical issues without a plausible execution path.

## Always review

### Diff and behavior

- Good: the diff is minimal, coherent, and matches the stated behavior; deleted code and renamed symbols have no remaining references.
- Bad: unrelated refactors, silently changed behavior, unhandled error paths, dead branches, TODO workarounds, or comments that describe code instead of intent.

### Security and secrets

- Good: credentials stay in environment/configuration, authorization is enforced at the server boundary, user-controlled input is validated, uploaded files and database queries are constrained, and errors do not disclose secrets or internals.
- Bad: API keys, tokens, passwords, private URLs, `.env` contents, sensitive logs, missing authorization checks, unsafe interpolation, unrestricted file paths, or trusting client-provided identity.

### Tests and verification

- Good: tests cover changed behavior, failure paths, authorization boundaries, validation, and regressions; checks are deterministic.
- Bad: no tests for a new branch or critical path, only happy-path assertions, brittle sleeps, skipped failures, or tests that verify implementation details instead of behavior.

### Naming, duplication, and dead code

- Good: names express domain intent, functions have one responsibility, duplicated logic is centralized only when the abstraction is clear, and unused code/imports/configuration are removed.
- Bad: vague names (`data`, `value`, `doThing`), boolean parameters with unclear meaning, oversized handlers/components, copy-pasted business rules, unreachable code, unused exports, or compatibility code without a consumer.

## Backend: Go

Select when `backend/` contains changed files.

### Architecture

- Good: `cmd/` contains only executable entrypoints; `internal/app/` composes dependencies; `internal/config/` owns configuration; domain packages such as `internal/auth` and `internal/monitor` own domain behavior and transport boundaries; `internal/platform/` contains shared technical adapters; migrations stay in `migrations/`.
- Bad: business logic in `cmd/`, global mutable dependencies, domain packages importing application composition, handlers reaching directly into infrastructure, or unrelated domains coupled through shared state.

### HTTP/API

- Good: every route has accurate swaggo annotations for method/path, parameters, body, responses, and security; authentication and ownership checks happen server-side; status codes and JSON shapes match the generated contract.
- Bad: undocumented routes, stale generated OpenAPI files, path/body mismatch, missing authorization, leaking internal errors, accepting unknown or oversized input, or changing a response without updating frontend consumers.

### Go correctness and concurrency

- Good: errors are wrapped with context and handled, contexts are propagated, resources are closed, transactions have clear boundaries, goroutines have cancellation/ownership, and time/IDs are testable.
- Bad: ignored errors, leaked rows/files/tickers, data races, goroutines without shutdown, unchecked type assertions, nil dereferences, or SQL/URL validation gaps.

## Frontend: Next.js

Select when `frontend/` contains changed files.

### Architecture and rendering

- Good: routes/layouts stay in `src/app/`, reusable feature behavior stays in `src/features/`, shared API/client code stays in `src/shared/`; server components are the default and `'use client'` is limited to browser state, effects, or event handlers.
- Bad: business logic in page shells, duplicated API calls, server-only secrets imported into client code, unnecessary client boundaries, or feature code placed in `public/`/generated output.

### TypeScript and UI behavior

- Good: strict types model API success/error states, external data is validated at the boundary, loading/error/empty states are explicit, forms prevent duplicate submits, and accessibility semantics/keyboard behavior are preserved.
- Bad: unjustified `any`, unsafe casts, assuming API data is complete, swallowed promise errors, hydration mismatch, unbounded effects, unstable list keys, inaccessible controls, or user-visible failures with no recovery path.

### API and security

- Good: the shared API client owns base URL, credentials, token lifecycle, and normalized errors; only browser-safe variables use `NEXT_PUBLIC_`; auth state is not trusted solely from local UI state.
- Bad: direct duplicated `axios`/`fetch` configuration, tokens or secrets in source/logs, exposing service credentials to the browser, unsafe HTML injection, or frontend assumptions that contradict the backend contract.

## Output format

Start with a short scope and verification summary. Then list findings ordered by priority from P0 to P3. For each finding use:

```text
[P1] Short title
File: path/to/file.ts:42
Impact: what can fail and who is affected.
Fix: the smallest safe correction.
```

End with:

- `Blocking findings: yes/no` based on P0/P1 findings.
- `Checks: passed/failed/not run`, naming the exact commands and failures.
- `Reviewed sections`: backend, frontend, security, tests, architecture, or the applicable subset.

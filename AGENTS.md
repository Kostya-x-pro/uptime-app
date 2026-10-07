# Repository Guidelines

## Repository Layout

This repository contains two independent applications:

- `frontend/` — Next.js web application; see `frontend/AGENTS.md`.
- `backend/` — Go service; see `backend/AGENTS.md`.

Treat these projects as separate modules. Run their commands from their own directories and keep changes scoped to the affected application unless an integration change requires both.

## Cross-Project Changes

When work spans the API boundary, document request and response changes in the pull request and update both applications together. Keep configuration local to each application; do not add shared secrets or environment files at repository root.

## Commit & Pull Request Guidelines

This repository has no Git history yet, so no established commit convention exists. Use concise imperative commits, preferably Conventional Commits: `feat: add monitor form` or `fix: handle timeout`. Keep commits scoped to one concern.

Pull requests should describe the change, list the verification commands run, and link the relevant issue when available. Include screenshots for visible frontend changes and identify API-contract changes explicitly.

## Pull Request Workflow

Follow this workflow after completing a task:

1. Confirm the working tree only contains the task changes, review the diff against `main`, and run the relevant validation commands for every changed module.
2. Commit each remaining logical change with a Conventional Commit message. Keep the branch up to date with `main` without discarding task changes.
3. Push the current branch to `origin` with upstream tracking.
4. Create a pull request from the current branch into `main`. Its title must be a Conventional Commit subject, use the same type and concise imperative style as the implementation commit.
5. Write the PR body in a temporary file and pass it to `gh pr create --body-file`. Include these sections when applicable:
   - `## Summary` — the user-visible outcome and purpose.
   - `## Changes` — concrete implementation details, grouped by module.
   - `## API contract` — routes, request/response fields, status codes, or `None`.
   - `## Security` — protections introduced or relevant security considerations.
   - `## Verification` — exact commands run and their result.
   - `## Screenshots` — links or `Not applicable`.
   - `## Issue` — linked issue or `Not applicable`.
6. Verify the PR URL, base branch, head branch, title, and checks after creation. Do not merge it unless the user explicitly asks.

## Security & Configuration

Do not commit `.env` files, credentials, `node_modules/`, or build output. Use local environment variables for secrets and document required variable names in the relevant application README.

## Коммиты
– Формат: Conventional Commits (feat, fix, refactor, test, docs, chore)
– Заголовок до 72 символов, в повелительном наклонении
– Без эмодзи, без «significantly improved» и прочей воды
– Тело — только если нужно объяснить «почему», а не «что»
– Один логический шаг — один коммит

## Ветки и Pull Request

– Используй GitHub Flow: перед началом каждой задачи создай отдельную ветку от актуальной `main`.
– Именуй ветку по типу и краткому названию задачи в kebab-case: `feat/<feature-name>`, `fix/<issue-name>`, `docs/<topic>`, `refactor/<scope>`.
– Не вноси задачные изменения напрямую в `main`.
– После завершения задачи создай Pull Request из рабочей ветки в `main`; вливай изменения только через PR после проверки.

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

## Security & Configuration

Do not commit `.env` files, credentials, `node_modules/`, or build output. Use local environment variables for secrets and document required variable names in the relevant application README.

## When startin a new task use secton with branchs and pr

details in file: docs/rules/branches-and-pr.md

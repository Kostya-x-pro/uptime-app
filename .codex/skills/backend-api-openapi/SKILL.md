---
name: backend-api-openapi
description: "Maintain swaggo annotations and regenerate OpenAPI and ReDoc documentation when Go backend API routes are added, changed, or removed."
---

# Backend API OpenAPI

Use this skill whenever a change adds, edits, renames, or removes an HTTP route in `backend/`. Do not activate it for changes that cannot affect the backend API surface.

## Workflow

1. Inspect all backend router registrations, not only the changed lines, and compare them with the generated contract. Identify the exact HTTP method, path, authentication requirement, request parameters/body, success response, and error statuses for every operation.
2. Add or update a swaggo doc comment directly above every affected handler; if an existing route has no annotation, document it too. Keep annotations consistent with the actual `net/http` behavior:
   - `@Summary`, `@Tags`, `@Accept`, and `@Produce` where applicable;
   - `@Param` for path parameters, request bodies, multipart fields, and other supported parameters;
   - `@Security BearerAuth` for routes protected by the access-token middleware;
   - `@Success`, `@Failure`, and `@Router` with the real status codes and route;
   - update the general API annotations in `backend/cmd/server/main.go` when API metadata or security definitions change.
3. For a removed route, remove its obsolete annotations with the handler and regenerate the contract so the operation disappears from every generated artifact.
4. Regenerate all API documentation with the bundled script from the repository root:

   ```bash
   powershell.exe -ExecutionPolicy Bypass -File .codex/skills/backend-api-openapi/scripts/generate-docs.ps1
   ```

   The script first synchronizes swaggo output and then immediately generates ReDoc HTML from the resulting `swagger.yaml`. It accepts `-BackendPath` when the backend is not in the default `backend/` directory. The generated files are `backend/docs/docs.go`, `backend/docs/swagger.json`, `backend/docs/swagger.yaml`, and `backend/docs/swagger.html`; keep them in the same change as the route implementation.
5. Validate that the generated JSON is valid and that the changed operation is present or absent as intended. Run `go test ./...` and `go vet ./...` from `backend/` for backend changes.

If the existing implementation and requested contract disagree, document the discrepancy and resolve it with the user before inventing API behavior. Never add credentials, tokens, or environment values to the generated documentation.

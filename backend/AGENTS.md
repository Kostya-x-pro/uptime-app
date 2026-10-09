# Backend Guidelines

## Structure

This is a Go 1.24 service module. Keep executable entry points in `cmd/`; the current service entry point is `cmd/server/main.go`. Application composition belongs in `internal/app/`, configuration in `internal/config/`, and shared technical adapters in `internal/platform/`. Keep database migrations in `migrations/`.

As domain code is introduced, place it in focused packages under `internal/`. Do not place business logic in `cmd/` or mix it with transport and infrastructure concerns.

## Development Commands

Run all commands from `backend/` after installing Go 1.24 or newer:

```bash
go run ./cmd/server  # run the service entry point
go test ./...        # run all package tests
go vet ./...         # run static analysis
```

Format changed Go files with `gofmt` before committing. Run `go test ./...` and `go vet ./...` for every backend change.

## API Documentation

Add swaggo annotations to every new or changed HTTP route, including its parameters, request body, responses, and security requirements. After changing routes or annotations, regenerate the contract from `backend/`:

```bash
go run github.com/swaggo/swag/cmd/swag init -g cmd/server/main.go -o docs
npx --yes @redocly/cli build-docs docs/swagger.yaml --output docs/swagger.html --disableGoogleFont
```

Commit the regenerated `docs/docs.go`, `docs/swagger.json`, `docs/swagger.yaml`, and `docs/swagger.html` files together with the API changes.

## Style and Testing

Follow standard Go conventions. Use tabs as produced by `gofmt`; package names are short, lowercase, and contain no underscores. Exported identifiers use `PascalCase`; unexported identifiers use `camelCase`. Prefer explicit dependencies and small interfaces at the consumer boundary.

Write tests in `*_test.go` files next to the package they test. Name test functions after the observed behavior, for example `TestCreateMonitorRejectsEmptyURL`. Use table-driven tests when covering multiple input cases.

## Configuration and Security

Read secrets and deployment-specific settings from environment variables; never commit `.env` files or credentials. Add a documented example variable name to the backend README when introducing new configuration.

## Комментарии в коде
- Комментарии пишем на русском языке
- Комментируй ПОЧЕМУ, а не что, так как это видно из когда
- Очевидное не комментируй, лучше используй правильные найменования функций
- Публичные функции doc comment
- Сложную арифметику, поясняй рядом
- Меняешь код актуализируй комметнарий

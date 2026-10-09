# Uptime App Backend

Go service for uptime monitoring.

## Layout

- `cmd/server` — service entry point
- `internal/config` — application configuration
- `internal/app` — application composition
- `internal/platform` — shared technical adapters
- `migrations` — database migrations

## Prerequisites

Install Go 1.24 or newer. Configure the service with:

| Variable | Required | Description |
| --- | --- | --- |
| `DATABASE_URL` | yes | PostgreSQL connection URL |
| `JWT_SECRET` | yes | Random secret of at least 32 characters for HS256 access tokens |
| `FRONTEND_ORIGIN` | no | Allowed browser origin, e.g. `http://localhost:3000` |
| `COOKIE_SECURE` | no | `true` in HTTPS production environments; defaults to `false` |
| `ACCESS_TOKEN_TTL` | no | Go duration; defaults to `24h` |
| `REFRESH_TOKEN_TTL` | no | Go duration; defaults to `720h` (30 days) |
| `HTTP_ADDR` | no | Listen address; defaults to `:8080` |
| `MIGRATIONS_DIR` | no | SQL migration directory; defaults to `migrations` |
| `UPLOADS_DIR` | no | Local directory for uploaded files; defaults to `uploads` |

Then run:

```bash
go run ./cmd/server
```

## Docker Compose

Set a secure JWT secret and start PostgreSQL and the API:

```bash
JWT_SECRET="at-least-32-random-characters-long" docker compose up --build
```

In PowerShell:

```powershell
$env:JWT_SECRET = "at-least-32-random-characters-long"
docker compose up --build
```

The API is available at `http://localhost:8080`; Compose applies migrations on API startup.

## API contract

The generated Swagger/OpenAPI 2.0 contract is available in [`docs/swagger.yaml`](docs/swagger.yaml) and [`docs/swagger.json`](docs/swagger.json).
Regenerate it after changing API annotations with:

```bash
go run github.com/swaggo/swag/cmd/swag init -g cmd/server/main.go -o docs
npx --yes @redocly/cli build-docs docs/swagger.yaml --output docs/swagger.html --disableGoogleFont
```

The generated ReDoc page is available at [`docs/swagger.html`](docs/swagger.html).

## File uploads

Authenticated clients can upload a file with `POST /api/v1/files` as `multipart/form-data` using the `file` field. The response contains its generated name, public URL, detected content type, and size. Files are stored locally in `UPLOADS_DIR`; regular files are served as downloads. Profile avatars use the same storage through `POST /api/v1/profile/avatar`, but accept only JPEG, PNG, and GIF files up to 5 MB.

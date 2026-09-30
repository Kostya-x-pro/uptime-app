# Local development

## Run frontend and backend

Start PostgreSQL first, for example through Docker Compose:

```powershell
$env:JWT_SECRET = "at-least-32-random-characters-long"
docker compose up -d postgres
```

The repository includes an ignored `.env` with local development values. To make a fresh local configuration, copy `.env.example` to `.env`, change `JWT_SECRET`, and run both applications from the repository root:

```powershell
npm run dev
```

The script starts the Go API at `http://localhost:8080` and Next.js at `http://localhost:3000`. Stop both with `Ctrl+C`.

The Compose PostgreSQL container is published on `localhost:5433` to avoid conflicts with other local PostgreSQL installations.

## Reset a local PostgreSQL volume

If the API reports that the `uptime` role does not exist, the Compose volume was initialized with an older database configuration. When the local database contains no data that must be retained, recreate it:

```powershell
docker compose down -v
docker compose up -d postgres
```

`down -v` deletes the local PostgreSQL data volume. Do not use it for a database that contains data you need to keep.

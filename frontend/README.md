# Uptime frontend

Next.js client for account registration and authentication.

## Configuration

Copy `.env.example` to `.env.local` and set the browser-visible backend URL:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:8080
```

The backend must allow `http://localhost:3000` through `FRONTEND_ORIGIN` and run with `COOKIE_SECURE=false` locally.

## Run

```bash
npm run dev
```

Open `http://localhost:3000`.

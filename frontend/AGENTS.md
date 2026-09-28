# Frontend Guidelines

## Structure

This is a Next.js 16 application using TypeScript, App Router, Tailwind CSS 4, and ESLint. Keep pages, layouts, and route handlers in `src/app/`. Place reusable UI and feature code under `src/` in directories that reflect the feature. Store public static assets in `public/`.

Use the `@/*` import alias for modules below `src/`. Do not put application source files in `public/` or generated files in `src/`.

## Development Commands

Run all commands from `frontend/`:

```bash
npm run dev     # start the development server
npm run lint    # run ESLint
npm run build   # validate the production build
npm run start   # serve a production build
```

Run `npm run lint` and `npm run build` before opening a pull request. Keep `package-lock.json` in sync whenever dependencies change.

## Style and Testing

Use TypeScript; avoid `any` unless it is justified at an external boundary. Use two-space indentation, `PascalCase` for React component files and component names, and `camelCase` for functions and variables. Use lowercase, hyphenated names for route directories when a multiword route is needed.

Follow the configured ESLint rules and prefer server components by default; add `'use client'` only when browser state, effects, or event handlers require it.

No test runner is configured yet. When one is added, keep tests alongside the feature or in a nearby `__tests__/` directory, using descriptive names such as `monitor-form.test.tsx`.

## Configuration

Keep secrets in uncommitted `.env.local` files. Prefix only browser-safe variables with `NEXT_PUBLIC_`; never expose service credentials to the client.

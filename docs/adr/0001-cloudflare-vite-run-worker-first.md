# ADR 0001: run_worker_first for /api/* routes

## Status
Accepted

## Context
With `@cloudflare/vite-plugin`, requests go through a router worker that checks whether the asset worker can handle the request before invoking the user worker. In SPA mode (`not_found_handling: "single-page-application"`), the asset worker claims it can handle _every_ request (it always has `index.html` as a fallback). This means browser navigations — including the Better Auth OAuth callback at `/api/auth/callback/google` — never reach the user worker in development. They get served `index.html` instead, and the React app renders with no session.

## Decision
Set `assets.run_worker_first: ["/api/*"]` in `wrangler.json`. This tells the router to invoke the user worker first for any path under `/api/`, bypassing the asset/SPA check.

## Consequences
- All `/api/*` requests are handled by the Worker in both dev and production.
- The SPA fallback still applies to all other paths (frontend routes).
- Without this, any OAuth callback or server-side redirect under `/api/` silently falls through to the SPA in local dev.

# ADR 0002: Better Auth routes handled outside Hono via custom fetch handler

## Status
Accepted

## Context
Better Auth's handler needs to respond to nested paths like `/api/auth/callback/google`. Hono's `app.all()` wildcard (`*` or `**`) does not reliably match multi-segment paths in Hono v4, so routes like `app.all("/api/auth/**", ...)` silently fail to match the callback path. Attempts with both `app.all()` and `app.use()` using `*` and `**` wildcards all failed.

## Decision
Export a custom `fetch` handler object instead of the Hono app directly. The fetch handler checks `url.pathname.startsWith("/api/auth/")` and passes matching requests straight to `auth.handler(request)`, bypassing Hono's router entirely for auth routes. All other requests fall through to `app.fetch()`.

```ts
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname.startsWith("/api/auth/")) {
      return createAuth(env).handler(request);
    }
    return app.fetch(request, env, ctx);
  },
} satisfies ExportedHandler<Env>;
```

## Consequences
- Better Auth handles all `/api/auth/**` paths correctly regardless of nesting depth.
- Hono middleware (e.g. bookmark auth) still runs normally for non-auth routes.
- If Hono's wildcard matching improves in a future version, this can be simplified back to `app.all()`.

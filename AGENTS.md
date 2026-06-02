# Cache

Cache is a personal bookmark manager for saved web resources. Users sign in with Google (approved emails only) and save, archive, or delete bookmarks. See `CONTEXT.md` for the domain language (User, Bookmark, Archived vs Deleted, Import) and `docs/adr/` for architectural decisions — read these before changing behavior.

## Tech stack

Full-stack app running entirely on Cloudflare Workers:

- **Backend**: Hono on Workers; Cloudflare D1 (binding `DB`, database `prod-bookmarks`)
- **Auth**: Better Auth with Google OAuth; access gated by an `ALLOWED_EMAILS` allowlist
- **Frontend**: React 19 + Vite, served as a single-page app from `dist/client`
- **UI**: shadcn/ui (`base-vega` style) on Base UI primitives, Phosphor icons, cmdk; Tailwind v4 (no config file — themed inline in `src/react-app/index.css`)
- **Tooling**: TypeScript (strict), ESLint, Prettier (with tailwindcss class sorting), wrangler

Prefer the stack already in use here over introducing alternatives.

## Project structure

- `src/worker/` — Hono backend: `index.ts` (routes + bookmark CRUD), `auth.ts` (Better Auth config + `isApprovedEmail`)
- `src/react-app/` — React entry, `App.tsx`, `auth-client.ts`
- `src/components/` — UI components; `ui/` holds shadcn components, `app-sidebar.tsx` is the nav
- `src/hooks/`, `src/lib/utils.ts` (`cn()` helper); `@` aliases `./src`
- `schema.sql` — full D1 schema; `migrations/` — ordered SQL migrations
- `wrangler.json`, `vite.config.ts` — infra and build config

## Gotchas

- **Auth routing**: `/api/auth/*` is handled by Better Auth's fetch handler directly, bypassing Hono wildcard routing (ADR-0002). `/api/*` runs the worker first via `assets.run_worker_first` (ADR-0001).
- **`kysely` is pinned to `0.28.17`** in `overrides` for the Better Auth adapter — don't bump it.
- Bookmark API is strict: unknown fields → 400, invalid URL → 400, missing/invalid session → 401/403.

## Commands

- Don't run the dev server (`npm run dev`) — assume it's already running.
- Don't run build commands (`npm run build`) unless asked. Note `npm run check` also builds and dry-run deploys.
- For checking, prefer `npm run lint` (ESLint). `npm run cf-typegen` regenerates Worker types.
- Package manager is **npm** (`package-lock.json`). Never use yarn.

## Code style

- TypeScript: never use `any` unless 100% necessary or otherwise specified.
- Always strive for concise, simple solutions; if a problem can be solved more simply, propose it.
- If asked to do a lot of work at once, stop and state that clearly.

## Agent skills

### Issue tracker

Issues and PRDs are tracked as local markdown files under `.scratch/`. See `docs/agents/issue-tracker.md`.

### Triage labels

Uses the default five-role triage vocabulary. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context repo: root `CONTEXT.md` plus root `docs/adr/` when present. See `docs/agents/domain.md`.

# ADR 0003: Server-side URL metadata enrichment via a dedicated /import endpoint

## Status
Accepted

## Context
A **User** can **Import** a **Bookmark** by pasting only a URL into the add palette. A Bookmark requires a `title` (the `bookmarks.title` column is `NOT NULL`, and `POST /api/bookmarks` rejects an empty title), so a URL-only paste cannot use that endpoint as-is.

Deriving a title (and description/image) from a page requires fetching the page. The browser cannot fetch arbitrary third-party pages because of CORS, so enrichment must happen server-side in the Worker. Fetching arbitrary user-supplied URLs from the Worker is an SSRF / abuse / reliability surface that needs guarding.

## Decision
Add a dedicated `POST /api/bookmarks/import` endpoint that accepts `{ url }` only (covered by the existing `/api/bookmarks/*` auth middleware). It:

1. Validates the URL: `http:`/`https:` scheme only; rejects `localhost`, loopback, link-local (`169.254.x`), and private ranges (`10/172.16/192.168`). Invalid/blocked → `400`, nothing saved.
2. If the `(user_id, url)` pair already exists, returns the existing **Bookmark** with `200` instead of inserting a duplicate. New inserts return `201`.
3. Fetches the page with hardening: `AbortSignal.timeout` (~5s), explicit `User-Agent`, `text/html` content-type check, and a response size cap.
4. Parses **Bookmark Metadata** with the native `HTMLRewriter`: `<title>` (with `og:title` fallback) → `title`; meta description (with `og:description` fallback) → `description`; `og:image` → `image_url`.
5. On any enrichment failure (timeout, non-HTML, missing title), falls back to `title = hostname` and saves anyway.

The strict typed `POST /api/bookmarks` CRUD endpoint is left unchanged.

## Alternatives considered
- **Relax `POST /api/bookmarks`** to make `title` optional and enrich inline. Rejected: it muddies the existing typed validation contract (commit `f53d7fd`) and overloads one endpoint with two behaviours.
- **Client-side fetch + parse.** Impossible: CORS blocks the browser from reading arbitrary third-party pages.
- **Prompt the user for a title.** Rejected: defeats the "just paste a URL" goal.
- **Reject on enrichment failure** instead of falling back. Rejected: a flaky or slow page would lose the Bookmark; hostname fallback keeps Import resilient (the **User** can edit the title later via PATCH).

## Consequences
- The Worker makes outbound fetches to untrusted URLs; the hardening bundle above is required and must be kept in place.
- `image_url` holds a remote `og:image` URL (see CONTEXT.md). There is no image storage (R2) yet; a future ADR decides store-vs-link if that changes.
- Import always creates an active, non-favorite Bookmark; favorite/archived stay at their defaults.
- Enrichment quality depends on third-party markup; titles may be imperfect and are user-editable.

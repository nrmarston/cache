# PRD: Import a Bookmark from a pasted URL

Status: done

## Problem Statement

As a User of Cache, the only way to save a web resource today is by hand: the header's `+` button does nothing, and the underlying create path demands a title, a URL, and other fields up front. When I find something worth keeping I just have the URL on my clipboard — I don't want to stop and type a title and description before it's saved. There is no fast "paste a link, keep it" path.

## Solution

Clicking the `+` button in the Bookmarks header (or pressing ⌘K / Ctrl+K) opens a command-palette-style dialog. I paste a URL, press Enter, and the Bookmark is saved. The server **Imports** the Bookmark: it fetches the page and derives **Bookmark Metadata** (title, description, image) so I get a meaningful entry without typing anything. If the page can't be fetched, the Bookmark is still saved with the URL's hostname as the title, which I can edit later. If I paste a URL I already saved, Cache surfaces the existing Bookmark instead of creating a duplicate.

## User Stories

1. As a User, I want a `+` button in the Bookmarks header that opens an add dialog, so that I can start saving a link without leaving the page.
2. As a User, I want to open the add dialog with a ⌘K / Ctrl+K keyboard shortcut, so that I can capture a link without reaching for the mouse.
3. As a User, I want to close the dialog with Esc, so that I can dismiss it quickly if I opened it by mistake.
4. As a User, I want to paste a URL into the dialog and press Enter, so that I can Import a Bookmark in one motion.
5. As a User, I want the dialog to show a clear "Save bookmark: {url}" action only when my input is a valid URL, so that I know it's ready to save.
6. As a User, I want the dialog to do nothing destructive when my input isn't a valid URL with a scheme, so that I don't save garbage entries.
7. As a User, I want the Bookmark's title to be filled in automatically from the page, so that my list is readable without manual typing.
8. As a User, I want a description filled in automatically from the page when available, so that I have more context later.
9. As a User, I want a preview image captured from the page when available, so that my Bookmark is visually recognizable.
10. As a User, I want the Bookmark saved even when the page can't be fetched, so that a flaky or slow site doesn't make me lose the link.
11. As a User, I want a Bookmark that failed enrichment to use the URL's hostname as its title, so that it's still identifiable in my list.
12. As a User, I want to edit the title later if the auto-derived one is wrong, so that I can clean up my list (uses existing edit path).
13. As a User, I want to see a "Saving…" indication while the Import is in progress, so that I know the app is working and don't double-submit.
14. As a User, I want the dialog to close and my list to refresh after a successful Import, so that I immediately see the new Bookmark.
15. As a User, I want to be told "Already saved" when I paste a URL I already own, so that I understand why no new entry appeared.
16. As a User, I want the duplicate case to surface my existing Bookmark rather than create a second copy, so that my list stays clean.
17. As a User, I want a clear inline error in the dialog if the Import fails unexpectedly, with the dialog staying open, so that I can retry or correct the URL.
18. As a User who pastes a URL without a scheme (e.g. `example.com`), I want clear feedback that it isn't yet a valid URL, so that I know to paste the full address.
19. As a User, I want only my own Bookmarks affected by Import, so that my data stays private and scoped to me (uses existing auth).
20. As an unauthenticated or unapproved visitor, I want the Import endpoint to reject me, so that the feature respects Cache's approval model.
21. As a User, I want Imported Bookmarks to default to active and non-favorite, so that they behave like any normally created Bookmark.
22. As the system operator, I want the Worker to refuse to fetch internal/private addresses, so that the Import feature can't be used for SSRF.
23. As the system operator, I want page fetches to time out and cap their size, so that a slow or huge page can't hang or overload the Worker.

## Implementation Decisions

**UI pattern** — Reuse the existing `CommandDialog` (cmdk) scaffolding. The dialog has a single URL input and renders one dynamic action item, "Save bookmark: {url}", which is only present/enabled when the input parses as a valid `http`/`https` URL. This is the **M6 ImportBookmarkCommand** component.

**Triggers (M7)** — The header `+` button gets an `onClick` that opens the dialog. A global ⌘K / Ctrl+K key listener also opens it. Esc closes it (cmdk default). `BookmarksPage`'s one-shot load is extracted into a callable `loadBookmarks` so it can be re-run after an Import.

**Input handling** — Full URL with scheme is required. Input without a scheme (e.g. `example.com`) is treated as not-yet-valid and shows no save action; no auto-prepend of `https://`. Client validation mirrors server validation (`new URL()` + `http`/`https`).

**API contract** — New endpoint `POST /api/bookmarks/import`, request body `{ url }` only (reject unknown fields, consistent with the existing create validator). It is covered by the existing bookmark auth middleware (auth + approved-email check). Responses:
- `201` with the created Bookmark when a new Bookmark is Imported.
- `200` with the existing Bookmark when the `(user_id, url)` pair already exists (duplicate).
- `400` for an invalid or blocked URL (bad scheme, malformed, private/internal host).
The existing strict `POST /api/bookmarks` create endpoint is left unchanged (see ADR 0003).

**URL validation / guard (M1 `validateImportUrl`)** — Pure function. Accepts only `http:`/`https:`. Rejects `localhost`, loopback (`127.0.0.0/8`), link-local (`169.254.x`), and private ranges (`10/172.16/192.168`). Returns a normalized URL or a structured error.

**Page fetch (M3 `fetchPage`)** — Hardened fetch: `AbortSignal.timeout` (~5s), explicit `User-Agent`, `text/html` content-type check (skip parsing otherwise), and a response size cap. Thin I/O wrapper isolating the hardening.

**Metadata extraction (M2 `extractMetadata`)** — Uses native `HTMLRewriter` (no dependency). Maps `<title>` (fallback `og:title`) → title; meta description (fallback `og:description`) → description; `og:image` → image. Title length is capped. Returns a partial metadata object; missing fields are left undefined for the caller to handle.

**Import orchestration (M4 `importBookmark`)** — Service composing the above: validate URL → look up existing `(user_id, url)` → if found, return it flagged as duplicate → otherwise fetch + extract → on any enrichment failure (timeout, non-HTML, missing title) fall back to `title = hostname` → insert and return the new Bookmark flagged as not-duplicate. Imported Bookmarks default to active, non-favorite.

**Route handler (M5)** — Thin Hono handler mapping `importBookmark`'s result to the `200`/`201`/`400` contract above.

**Schema change** — Rename column `bookmarks.image_path` → `bookmarks.image_url`, because it now holds a remote `og:image` URL rather than a stored path (there is no R2 image storage yet). This is a new numbered D1 migration (`0002`, `ALTER TABLE ... RENAME COLUMN`), plus matching updates to the full-schema file and the worker's Bookmark type and the create/update field allowlists. The existing create/update/get endpoints continue to expose this field under its new name.

**Domain language** — New glossary terms recorded in CONTEXT.md: **Import** (create a Bookmark from a pasted URL; server derives metadata) and **Bookmark Metadata** (title/description/image derived on Import; title falls back to hostname). Duplicate-on-Import behavior is recorded as a relationship.

**Architecture rationale** — Captured in ADR 0003 (server-side URL metadata enrichment via a dedicated `/import` endpoint): server-side fetch is required because CORS blocks the browser from reading third-party pages; a dedicated endpoint keeps the strict typed create contract intact; SSRF hardening and hostname fallback are part of the decision.

## Testing Decisions

Good tests here assert **external behavior** through each module's public interface — given an input URL or HTML, what comes out — never internal helpers or HTMLRewriter handler wiring. There is no existing test suite, so this feature bootstraps the test setup: plain `vitest` for the pure modules, and `@cloudflare/vitest-pool-workers` for the service test that needs D1 bindings.

Modules to test:

- **M1 `validateImportUrl`** (pure): accepts `https`/`http`; rejects other schemes; rejects `localhost`, loopback, link-local, and private ranges; rejects a host with no scheme (e.g. `example.com`); rejects malformed input. Returns normalized URL on success.
- **M2 `extractMetadata`** (fixture HTML, no network): extracts `<title>`; falls back to `og:title`; extracts meta description and falls back to `og:description`; extracts `og:image`; returns undefined title when absent; caps overly long titles.
- **M4 `importBookmark`** (service, stubbed fetcher + test D1): happy path inserts and returns `duplicate:false`; a second Import of the same `(user_id, url)` returns the existing Bookmark with `duplicate:true` and inserts nothing; fetch/enrichment failure still inserts with `title = hostname`.

Not unit-tested (per developer): **M3 `fetchPage`** (network-bound I/O) and **M6/M7** frontend palette + shortcut (verified manually for a solo project). M3's hardening is exercised indirectly via M4's stubbed-fetcher tests.

Prior art: none in this repo — these are the first tests. Follow the existing typed-result style used by the bookmark validators (structured `{ ok, value } | { ok:false, error }` results) so tests read against clear return shapes.

## Out of Scope

- Image storage (R2) — `image_url` holds a remote `og:image` URL; store-vs-link is deferred to a future decision.
- Editing title/description/image inside the Import dialog — editing uses the existing PATCH path after save.
- Bulk import (multiple URLs, paste a list, browser-bookmark file import).
- Re-fetching / refreshing metadata for an already-saved Bookmark.
- Tags, notes, folders, or any organization beyond the existing favorite/archived flags.
- Rendering the captured image or description in the Bookmarks list UI (this PRD only persists them).
- A toast/notification system — feedback is inline in the dialog.
- Rate limiting the Import endpoint.

## Further Notes

- The duplicate check is on the exact `(user_id, url)` pair; no URL canonicalization (trailing slash, query order, `utm_*` stripping) is performed in v1.
- `image_url` may contain a relative or protocol-relative `og:image`; resolving it against the page URL is a reasonable nicety but not required for v1.
- The hostname fallback should use the URL's hostname (e.g. `example.com`), keeping failed-enrichment Bookmarks identifiable.
- Existing endpoints already expose the image field; renaming to `image_url` is a breaking field-name change but the API has a single known client (this app), so no compatibility shim is needed.

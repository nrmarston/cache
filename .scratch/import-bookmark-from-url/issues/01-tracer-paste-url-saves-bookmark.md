# Tracer: paste a URL to Import a Bookmark (hostname title)

Status: done

## Parent

`.scratch/import-bookmark-from-url/PRD.md`

## What to build

The thinnest end-to-end path for **Importing** a **Bookmark**. The `+` button in the Bookmarks header opens a command-palette dialog (reusing the existing `CommandDialog`/cmdk scaffolding) with a single URL input. The dialog shows one action, "Save bookmark: {url}", only when the input parses as a valid `http`/`https` URL. Pressing Enter (or activating the item) calls a new `POST /api/bookmarks/import` endpoint with `{ url }`.

The server validates the URL (scheme allowlist + private/internal host guard) and, for this slice, saves the Bookmark immediately with `title` set to the URL's hostname — no page fetch or metadata enrichment yet. On success the dialog closes and the Bookmarks list refetches so the new Bookmark appears.

No enrichment, no duplicate check, and no keyboard shortcut in this slice — just prove the full pipe (UI → endpoint → D1 → list refresh).

## Acceptance criteria

- [x] The header `+` button opens the Import dialog
- [x] The dialog's save action appears only when the input is a valid `http`/`https` URL; input without a scheme (e.g. `example.com`) shows no save action
- [x] `POST /api/bookmarks/import` accepts `{ url }` only and rejects unknown fields
- [x] The endpoint is behind the existing bookmark auth (unauthenticated/unapproved callers are rejected)
- [x] Invalid scheme, malformed URL, or a private/internal host (localhost, loopback, link-local, private ranges) returns `400` and saves nothing
- [x] A valid URL is saved as a Bookmark owned by the current User with `title` = the URL hostname, active and non-favorite, returning `201` with the created Bookmark
- [x] After a successful Import the dialog closes and the list refetches, showing the new Bookmark
- [x] The URL validation/guard logic lives in an isolated, pure module (M1 `validateImportUrl`)

## Blocked by

- None - can start immediately

## Comments

Implemented as part of the full feature (issues 01–05 landed together):

- M1 `validateImportUrl` lives in `src/worker/import/validate-url.ts` (scheme allowlist + SSRF host guard).
- `POST /api/bookmarks/import` added in `src/worker/index.ts` (`{ url }` only via `validateImportBody`, behind the existing `/api/bookmarks/*` auth middleware), delegating to the `importBookmark` service.
- Header `+` button + `ImportBookmarkCommand` dialog (`src/components/import-bookmark-command.tsx`); `BookmarksPage` extracted a callable `loadBookmarks` and refetches on success.
- The tracer's hostname-title behavior is now the enrichment fallback (issue 02): on fetch failure the title is the URL hostname; on success it's the page title.

# Import enriches Bookmark with the page title

Status: done

## Parent

`.scratch/import-bookmark-from-url/PRD.md`

## What to build

On Import, the server fetches the pasted page and derives its title instead of using the hostname. Introduce a hardened page fetcher (M3 `fetchPage`: ~5s timeout, explicit `User-Agent`, `text/html` content-type check, response size cap) and a metadata extractor (M2 `extractMetadata`) using native `HTMLRewriter` to read `<title>` with an `og:title` fallback, capping title length.

Refactor the `/import` route into an `importBookmark` service (M4) that composes validate → fetch → extract → insert. If the fetch or extraction fails for any reason (timeout, non-HTML response, missing title), fall back to `title = hostname` and still save the Bookmark.

Demoable: Importing a real article URL produces a Bookmark whose title matches the page; Importing an unreachable URL still saves with the hostname title.

## Acceptance criteria

- [x] Importing a reachable HTML page sets the Bookmark `title` from `<title>` (or `og:title` when `<title>` is absent)
- [x] Overly long titles are capped to a sane length
- [x] Page fetches enforce a timeout, send an explicit `User-Agent`, only parse `text/html`, and cap response size
- [x] Any fetch/extraction failure falls back to `title = hostname` and the Bookmark is still saved (`201`)
- [x] The `/import` route delegates to an isolated `importBookmark` service (M4) using the pure `extractMetadata` (M2) module
- [x] Tests cover `extractMetadata` (M2) against fixture HTML and `importBookmark` (M4) with a stubbed fetcher (happy path + fallback); `validateImportUrl` (M1) tests added if not already present

## Blocked by

- `.scratch/import-bookmark-from-url/issues/01-tracer-paste-url-saves-bookmark.md`

## Comments

- M3 `fetchPage` (`src/worker/import/fetch-page.ts`): 5s `AbortSignal.timeout`, explicit `User-Agent`, `text/html` content-type check, and a 2 MB response cap (truncates beyond the cap).
- M2 `extractMetadata` (`src/worker/import/extract-metadata.ts`): native `HTMLRewriter`, `<title>` → `og:title` fallback, title capped at 200 chars.
- M4 `importBookmark` (`src/worker/import/import-bookmark.ts`): validate → dedupe → fetch → extract → insert; any enrichment failure falls back to `title = hostname` and still saves (`201`). Fetcher is injectable for tests.
- Tests: `test/validate-url.test.ts`, `test/extract-metadata.test.ts`, `test/import-bookmark.test.ts` (happy path + fallback) — 18 tests pass under `@cloudflare/vitest-pool-workers`.

# Importing an already-saved URL returns the existing Bookmark

Status: done

## Parent

`.scratch/import-bookmark-from-url/PRD.md`

## What to build

Make Import idempotent per User and URL. In the `importBookmark` service (M4), before inserting, look up an existing Bookmark for the current User with the same `url`. If one exists, return it flagged as a duplicate with HTTP `200` and insert nothing; otherwise insert as normal and return `201`.

In the dialog, the duplicate response shows an inline "Already saved" indication and does not add a second entry to the list. Matching is on the exact `(user_id, url)` pair — no URL canonicalization in this slice.

Demoable: Importing the same URL twice yields a single Bookmark; the second attempt reports "Already saved".

## Acceptance criteria

- [x] Importing a `(user_id, url)` that already exists returns the existing Bookmark with status `200` and a duplicate flag, inserting no new row
- [x] Importing a new URL still returns `201` with the created Bookmark
- [x] The dialog surfaces "Already saved" inline on a duplicate and does not add a duplicate entry to the list
- [x] Matching is on the exact `(user_id, url)` pair (no canonicalization)
- [x] `importBookmark` (M4) tests cover the duplicate path (returns existing, `duplicate:true`, no insert)

## Blocked by

- `.scratch/import-bookmark-from-url/issues/02-server-fetches-title.md`

(Can run in parallel with issue 03.)

## Comments

- `importBookmark` looks up `(user_id, url)` on the normalized `URL.href` before inserting; a hit returns the existing Bookmark with `duplicate: true` and no insert. The route maps `duplicate` → `200`, new → `201`.
- Matching is exact (no canonicalization beyond `new URL()` normalization).
- The dialog handles `200` by showing an inline "Already saved" notice and does not refetch/add an entry.
- `test/import-bookmark.test.ts` covers the duplicate path (returns existing, `duplicate:true`, no new row, fetcher not re-invoked).

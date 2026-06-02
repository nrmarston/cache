# Import captures description + image; rename image_path to image_url

Status: done

## Parent

`.scratch/import-bookmark-from-url/PRD.md`

## What to build

Extend metadata extraction to also capture the page description (meta description, falling back to `og:description`) and a preview image (`og:image`), and persist both on the Imported Bookmark.

Because the image column now holds a remote `og:image` URL rather than a stored path (there is no R2 image storage yet — see ADR 0003 and CONTEXT.md), rename the column `bookmarks.image_path` → `bookmarks.image_url`. This is a new numbered D1 migration (`0002`, `ALTER TABLE ... RENAME COLUMN`) plus matching updates to the full-schema file, the worker's Bookmark type and create/update field allowlists, and the frontend Bookmark type. Existing create/update/get endpoints continue to expose the field under its new name.

Demoable: Importing a page with Open Graph tags produces a Bookmark whose `description` and `image_url` are populated (verifiable via the bookmarks API or D1).

## Acceptance criteria

- [x] `extractMetadata` returns description (meta description, fallback `og:description`) and image (`og:image`)
- [x] Imported Bookmarks persist `description` and `image_url` when present, leaving them null otherwise
- [x] Migration `0002` renames `image_path` to `image_url`; `schema.sql` matches
- [x] Worker Bookmark type, create/update field allowlists, and the frontend Bookmark type all use `image_url`
- [x] Existing create/update/get bookmark endpoints work with the renamed field
- [x] `extractMetadata` (M2) tests extended for description/og fallbacks and og:image

## Blocked by

- `.scratch/import-bookmark-from-url/issues/02-server-fetches-title.md`

## Comments

- `extractMetadata` now also returns `description` (meta description → `og:description` fallback) and `image` (`og:image`); `importBookmark` persists `description`/`image_url` when present, else `null`.
- Migration `migrations/0002_rename_image_path_to_image_url.sql` (`ALTER TABLE bookmarks RENAME COLUMN`); `schema.sql` updated to match. Applied to the local D1 (0 rows, safe).
- `image_url` propagated through the worker `Bookmark` type + `bookmarkColumns` (`src/worker/bookmarks-table.ts`, a new shared module), the create/update field allowlists and SQL in `index.ts`, and the frontend `Bookmark` type in `App.tsx`.
- `extractMetadata` tests extended for the description/og fallbacks and `og:image`.

# Route Deleted Bookmark Behavior Through Persistence

Status: ready-for-human

## What to build

Refactor Deleted Bookmark behavior so DELETE requests use the User-owned Bookmark persistence Module. User-visible behavior must stay stable: delete is permanent removal, not archive, and a User can delete only their own Bookmark.

This slice should keep Archived Bookmark meaning separate from Deleted Bookmark behavior.

## Acceptance criteria

- [x] DELETE permanently removes the Bookmark row.
- [x] DELETE scopes lookup and mutation by owning User.
- [x] DELETE returns `404` for missing or non-owned Bookmarks.
- [x] DELETE returns `204` for successful permanent removal.
- [x] Deleted Bookmark behavior is owned by persistence, not route SQL.
- [x] Archived Bookmark state remains unaffected by delete refactor.
- [x] Focused D1-backed tests cover permanent removal and cross-User isolation.

## Blocked by

- `.scratch/deepen-user-owned-bookmark-persistence/issues/01-route-manual-bookmark-list-create-through-deep-persistence.md`

## Comments

- DELETE now delegates to `deleteBookmarkForUser()` in `src/worker/bookmarks/persistence.ts`.
- Route-level `204` mapping is covered in `test/bookmark-http-routes.test.ts`.

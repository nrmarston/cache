# Delegate Import Duplicate + Insert Behavior To Persistence

Status: ready-for-human

## What to build

Refactor Import so Bookmark Metadata enrichment remains in the Import Module, while duplicate lookup and Imported Bookmark insertion move behind the User-owned Bookmark persistence Seam. User-visible behavior must stay stable: Import creates a new Bookmark when needed, returns the existing Bookmark for duplicate URLs owned by the same User, and falls back to hostname when enrichment fails.

This slice should not change ADR 0003: Import remains a dedicated server-side endpoint.

## Acceptance criteria

- [x] Import Module still owns URL validation, page fetch, Bookmark Metadata extraction, and hostname fallback.
- [x] Duplicate lookup for Import is delegated to persistence.
- [x] Imported Bookmark insertion is delegated to persistence.
- [x] Duplicate Import for same User and normalized URL returns existing Bookmark and inserts nothing.
- [x] Duplicate lookup remains scoped by owning User.
- [x] Invalid or blocked Import URL inserts nothing.
- [x] Existing Import tests still pass after persistence delegation.
- [x] D1-backed tests cover duplicate behavior through the persistence Seam or Import Module.

## Blocked by

- `.scratch/deepen-user-owned-bookmark-persistence/issues/01-route-manual-bookmark-list-create-through-deep-persistence.md`

## Comments

- `src/worker/import/import-bookmark.ts` now delegates duplicate lookup and insert work to bookmark persistence.
- Delegation is locked by `test/import-bookmark-delegation.test.ts`; behavior is covered by `test/import-bookmark.test.ts`.

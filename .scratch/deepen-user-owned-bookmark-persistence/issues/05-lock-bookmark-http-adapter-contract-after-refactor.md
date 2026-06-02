# Lock Bookmark HTTP Adapter Contract After Refactor

Status: ready-for-human

## What to build

Add final verification around the Bookmark HTTP Adapter after persistence, request-contract, delete, and Import refactors land. The goal is to prove route handlers are thin Adapters and public HTTP behavior stayed stable across manual create, list, update, delete, and Import.

This slice should not introduce new product behavior. It should close gaps left by module-level tests where status-code mapping or request/response behavior remains risky.

## Acceptance criteria

- [x] Bookmark HTTP routes map validation failures to `400`.
- [x] Bookmark HTTP routes map missing or non-owned Bookmarks to `404`.
- [x] Manual Bookmark create still returns `201`.
- [x] Import still returns `201` for new Bookmark and `200` for duplicate Bookmark.
- [x] Delete still returns `204` for successful permanent removal.
- [x] Protected Bookmark routes still require authenticated approved User.
- [x] Auth routing decisions from accepted ADRs remain unchanged.
- [x] Route handlers contain no raw Bookmark storage SQL after refactor.
- [x] Add route-level tests only where module tests do not cover transport/status behavior.
- [x] Full relevant test suite passes.

## Blocked by

- `.scratch/deepen-user-owned-bookmark-persistence/issues/01-route-manual-bookmark-list-create-through-deep-persistence.md`
- `.scratch/deepen-user-owned-bookmark-persistence/issues/02-route-bookmark-updates-through-request-contract-persistence.md`
- `.scratch/deepen-user-owned-bookmark-persistence/issues/03-route-deleted-bookmark-behavior-through-persistence.md`
- `.scratch/deepen-user-owned-bookmark-persistence/issues/04-delegate-import-duplicate-insert-behavior-to-persistence.md`

## Comments

- Added `test/bookmark-http-routes.test.ts` for transport/status verification with mocked auth and import dependencies.
- `src/worker/index.ts` now acts as a thin HTTP adapter over bookmark persistence, request-contract validation, and the Import module.

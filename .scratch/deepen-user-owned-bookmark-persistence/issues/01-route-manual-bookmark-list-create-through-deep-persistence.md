# Route Manual Bookmark List/Create Through Deep Persistence

Status: ready-for-human

## What to build

Refactor manual Bookmark list and create behavior so route handlers use a deep User-owned Bookmark persistence Module and a Bookmark request-contract Module. User-visible HTTP behavior must stay stable: a User can list only their own Bookmarks, create a Bookmark through the strict manual create contract, and receive the same success/error shapes as before.

This slice should establish the persistence Seam used by later slices. It should not change Import behavior yet beyond keeping existing tests green.

## Acceptance criteria

- [x] Manual Bookmark list returns only Bookmarks owned by the authenticated User.
- [x] Manual Bookmark create preserves existing strict validation behavior for required title, URL validity, nullable fields, flags, malformed body, and unknown fields.
- [x] Manual Bookmark create returns a new active, non-favorite Bookmark unless request fields specify otherwise.
- [x] Bookmark row shape and selected storage fields live behind the persistence Module.
- [x] Route handlers no longer own SQL for manual Bookmark list/create.
- [x] Focused tests cover request-contract behavior for manual Bookmark create.
- [x] Focused D1-backed tests cover User-owned list/create persistence behavior and cross-User isolation.
- [x] Existing Import, URL validation, and Bookmark Metadata tests still pass.

## Blocked by

None - can start immediately

## Comments

- Implemented via `src/worker/bookmarks/request-contract.ts`, `src/worker/bookmarks/persistence.ts`, and a thinner `src/worker/index.ts`.
- Verified with `npm test -- --reporter verbose` and `npm run lint`.

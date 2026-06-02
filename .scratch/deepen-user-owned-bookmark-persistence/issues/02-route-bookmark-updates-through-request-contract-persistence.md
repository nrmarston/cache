# Route Bookmark Updates Through Request Contract + Persistence

Status: ready-for-human

## What to build

Refactor Bookmark update behavior so PATCH requests use the Bookmark request-contract Module and the User-owned Bookmark persistence Module. User-visible behavior must stay stable: a User can update only their own Bookmark, partial updates affect only sent fields, empty updates fail, and `updated_at` changes consistently.

This slice should build on the persistence Seam from issue 01 and remove route-level update assignment assembly.

## Acceptance criteria

- [x] PATCH rejects malformed bodies, unknown fields, empty bodies, invalid URLs, invalid flags, and invalid nullable fields through the request-contract Module.
- [x] PATCH updates only fields provided by the request.
- [x] PATCH scopes lookup and mutation by owning User.
- [x] PATCH returns `404` for missing or non-owned Bookmarks.
- [x] Bookmark update timestamp behavior is owned by persistence.
- [x] Route handlers no longer assemble storage update assignments.
- [x] Focused request-contract tests cover update validation behavior.
- [x] Focused D1-backed tests cover partial update behavior, timestamp mutation, and cross-User isolation.

## Blocked by

- `.scratch/deepen-user-owned-bookmark-persistence/issues/01-route-manual-bookmark-list-create-through-deep-persistence.md`

## Comments

- PATCH validation now lives in `src/worker/bookmarks/request-contract.ts`.
- PATCH storage mutation and `updated_at` handling now live in `src/worker/bookmarks/persistence.ts`.

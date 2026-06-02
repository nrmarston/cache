# PRD: Deepen User-Owned Bookmark Persistence

Status: ready-for-agent

## Problem Statement

Cache's Bookmark behavior is still too spread out for safe growth. Bookmark SQL, User ownership checks, row shape, request validation, timestamp mutation, Deleted Bookmark behavior, and Import duplicate handling sit across route handlers and the Import module. A maintainer changing one Bookmark rule must inspect several places to know what is safe.

This hurts Locality: bugs and decisions around Bookmarks are not concentrated. It also hurts Leverage: future archive, favorite, delete, filtering, and Import work will need to relearn low-level storage and request rules instead of crossing one deep Interface.

## Solution

Deepen the backend Bookmark architecture around a User-owned Bookmark persistence Module and a Bookmark request-contract Module.

From the maintainer's perspective, route handlers become thin HTTP Adapters. They authenticate a User, parse request bodies through the request-contract Module, call the User-owned Bookmark persistence Module, then map structured results to HTTP responses. The Import module keeps owning server-side Bookmark Metadata enrichment, but it delegates duplicate lookup and Bookmark insertion to the same persistence Seam as normal Bookmark creation.

From the User's perspective, behavior should stay stable: they can view, create, update, Import, archive, and delete their own Bookmarks only. Importing a URL they already own still returns the existing Bookmark instead of creating a duplicate.

## User Stories

1. As a maintainer, I want Bookmark storage rules in one Module, so that I can change persistence behavior without hunting through route handlers.
2. As a maintainer, I want User ownership checks hidden behind a Bookmark persistence Interface, so that no caller can accidentally read or mutate another User's Bookmark.
3. As a maintainer, I want Bookmark column selection owned by one Module, so that schema changes do not require duplicated SQL edits.
4. As a maintainer, I want Bookmark row shape owned by one Module, so that callers do not each define their own idea of a Bookmark.
5. As a maintainer, I want Bookmark creation defaults owned by one Module, so that active/non-favorite defaults stay consistent.
6. As a maintainer, I want Bookmark update timestamp behavior owned by one Module, so that every update changes `updated_at` consistently.
7. As a maintainer, I want Deleted Bookmark behavior owned by one Module, so that delete remains permanent and does not drift into archive semantics.
8. As a maintainer, I want Archived Bookmark state to remain separate from Deleted Bookmark behavior, so that reversible hiding and permanent removal stay distinct.
9. As a maintainer, I want Import duplicate lookup owned by the Bookmark persistence Seam, so that Import does not carry its own storage knowledge.
10. As a maintainer, I want Import insertion owned by the Bookmark persistence Seam, so that metadata enrichment does not also know SQL details.
11. As a maintainer, I want route handlers to stop assembling SQL update assignments, so that HTTP Adapters do not own storage implementation.
12. As a maintainer, I want route handlers to receive structured persistence results, so that 200/201/204/400/404 mapping is explicit and small.
13. As a maintainer, I want request validation in a named Bookmark request-contract Module, so that strict field rules have a direct test surface.
14. As a maintainer, I want unknown-field rejection tested outside Hono, so that contract tests stay fast and focused.
15. As a maintainer, I want create request validation tested outside Hono, so that title, URL, nullable text, and flag behavior stay stable.
16. As a maintainer, I want update request validation tested outside Hono, so that empty PATCH and partial update behavior stay stable.
17. As a maintainer, I want Import request validation tested outside Hono, so that `{ url }` remains the only accepted Import body.
18. As an AFK agent, I want clear Module seams, so that I can implement archive, favorite, or delete work without re-reading the whole Worker.
19. As an AFK agent, I want tests to cross the same Interfaces as production callers, so that refactors do not lock tests to implementation details.
20. As a User, I want to see only my own Bookmarks, so that my saved web resources stay private.
21. As a User, I want creating a Bookmark to preserve the existing strict request contract, so that bad or unknown fields still fail clearly.
22. As a User, I want updating a Bookmark to affect only fields I send, so that partial edits do not erase other Bookmark Metadata.
23. As a User, I want deleting a Bookmark to permanently remove it, so that Deleted Bookmark behavior stays clear.
24. As a User, I want archiving to remain reversible hiding, so that Archived Bookmark behavior does not get confused with deletion.
25. As a User, I want Importing an already-owned URL to return my existing Bookmark, so that Cache does not create duplicates.
26. As a User, I want failed Bookmark Metadata enrichment to still save a Bookmark with hostname fallback, so that flaky pages do not lose the saved web resource.
27. As a system operator, I want no change to Better Auth routing, so that accepted auth ADRs stay intact.
28. As a system operator, I want no change to server-side Import enrichment, so that CORS and SSRF decisions from the Import ADR stay intact.
29. As a system operator, I want Bookmark persistence tests against D1 behavior where useful, so that storage rules match production.
30. As a future maintainer, I want one place to decide durable duplicate behavior, so that concurrency or manual-create duplicate work has an obvious home.

## Implementation Decisions

- Keep the current stack: Hono on Cloudflare Workers, D1, Better Auth, TypeScript strict mode, npm.
- Keep accepted auth routing decisions unchanged: Better Auth routes still bypass Hono via the custom fetch handler, and `/api/*` still runs the Worker first.
- Keep ADR 0003 unchanged: Import remains a dedicated server-side endpoint and does not merge into the strict manual Bookmark create path.
- Add or deepen a User-owned Bookmark persistence Module. This Module owns Bookmark storage behavior: list by User, find by User and Bookmark ID, create, update, delete, find duplicate by User and URL, and create Imported Bookmark from derived Bookmark Metadata.
- The persistence Module owns SQL statements, selected columns, D1 binding calls, row-to-Bookmark shape, ID creation, defaults, and update timestamps.
- The persistence Module treats User ownership as an invariant. Callers pass the authenticated User identity; the Module must never expose or mutate a Bookmark without scoping by owning User.
- The Hono Bookmark route code becomes an HTTP Adapter. It should parse transport details, call Modules, and map structured results to responses. It should not assemble Bookmark SQL.
- The Import module keeps owning URL validation, page fetching, Bookmark Metadata extraction, hostname fallback, and enrichment orchestration. It stops owning duplicate lookup and raw insert SQL.
- The Bookmark request-contract Module owns strict request body validation for manual create, update, and Import request bodies.
- Request-contract behavior stays compatible with current rules: unknown fields fail; malformed body fails; create requires non-empty title and URL; update requires at least one accepted field; flags accept boolean or `0`/`1`; nullable text fields accept string or null.
- Manual create remains a strict typed path. This PRD does not require changing manual create into URL-only Import or metadata enrichment.
- Import duplicate behavior remains: if the User already owns a Bookmark with the normalized URL, Import returns that Bookmark and does not insert another.
- Storage-level uniqueness for `(User, normalized URL)` is not required in this PRD unless the agent can preserve existing manual-create behavior without ambiguity. The new persistence Seam should make that future decision localized.
- Public HTTP behavior should remain stable unless tests expose an existing bug. Expected mappings: list returns `200`, manual create returns `201`, Import returns `201` for new and `200` for duplicate, missing Bookmark returns `404`, validation failure returns `400`, delete returns `204`.
- Error text should remain as close as practical to existing behavior to avoid needless client churn.
- No frontend redesign is part of this PRD. Browser modules may keep calling existing endpoints.

## Testing Decisions

- Good tests cross Module Interfaces and assert external behavior. They should not assert private helper names, SQL string formatting, or route-internal control flow.
- Add focused tests for the Bookmark request-contract Module. Cover unknown fields, malformed body, required create fields, URL validity, nullable fields, flag coercion, empty update body, partial update fields, and Import body shape.
- Add focused tests for the User-owned Bookmark persistence Module using the existing Worker/D1 test setup. Cover list scoped to User, find scoped to User, create defaults, update timestamp behavior, partial updates, delete as permanent removal, and cross-User isolation.
- Add Import integration tests through the Import Module after persistence delegation. Existing Import behavior must still pass: enriched insert, hostname fallback, duplicate returns existing, invalid URL inserts nothing.
- Keep existing pure Import tests for URL validation and Bookmark Metadata extraction.
- Prior art: current tests use Vitest plus Cloudflare Worker/D1 test pool, with direct tests for Import orchestration and pure URL/metadata Modules. Follow that pattern.
- Route-level tests are optional. Prefer Module tests first because the goal is deeper Interfaces and better Locality. Add route tests only for status-code mapping if refactor risk is high.

## Out of Scope

- Changing Better Auth configuration or `/api/auth/*` routing.
- Replacing Hono, D1, Better Auth, Vite, React, or npm.
- Merging Import into manual Bookmark creation.
- Client-side Bookmark collection refactor.
- Sidebar filter wiring.
- Bookmark list UI redesign.
- Tags, notes, folders, bulk Import, browser bookmark file Import, or metadata refresh.
- URL canonicalization beyond current normalized `URL.href` behavior.
- Data cleanup for existing duplicate Bookmark rows.
- Adding image storage. `image_url` remains a remote URL.
- Rate limiting Import.
- Storage-level duplicate uniqueness unless manual-create behavior is explicitly preserved.

## Further Notes

- This PRD is an architecture-deepening slice. It should preserve User-visible behavior while improving Locality and Leverage for future Bookmark work.
- The strongest deletion-test signal is the current Bookmark table shape and SQL helper: deleting it mostly copies shallow facts elsewhere. The target Module should make deleting it expensive because ownership and persistence rules would otherwise reappear across callers.
- If implementation reveals a real need to decide manual-create duplicate behavior, pause and record that as a follow-up ADR or issue rather than guessing silently.

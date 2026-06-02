# PRD: Bookmark Item List UI

Status: ready-for-agent

## Problem Statement

As a **User** of Cache, I can confirm Bookmark CRUD behavior through JSON, but the Bookmarks page is still an API test surface rather than a usable bookmark manager. I need a scannable list of my **Bookmarks** with image, title, description, URL, and actions, while keeping the JSON view so I can inspect that UI actions are reflected in D1.

## Solution

Replace the JSON-only Bookmarks page with a restrained shadcn `Item` list. Each row shows a 40x40 **Bookmark Image** or fallback, a title, a description line, the URL in muted text, and action buttons on the right. Clicking the row opens the Bookmark URL in a new tab. Action buttons update `favorite`, `archived`, or permanently delete the Bookmark without triggering row navigation. The JSON inspector remains visible below the list so the User can compare UI changes with the current server state.

## User Stories

1. As a User, I want to see my Bookmarks as rows instead of raw JSON only, so that I can scan saved resources quickly.
2. As a User, I want each Bookmark row to show a 40x40 image, so that I can visually recognize the saved resource.
3. As a User, I want a fallback image treatment when no Bookmark Image exists, so that rows stay aligned and readable.
4. As a User, I want the Bookmark title to be the strongest text in each row, so that I can identify the resource first.
5. As a User, I want the Bookmark description shown under the title, so that I can recall why the resource matters.
6. As a User, I want the Bookmark URL shown as muted text on the description row, so that I can inspect the destination without it competing with the title.
7. As a User, I want long titles, descriptions, and URLs to truncate cleanly, so that rows do not overlap or reflow unpredictably.
8. As a User, I want row hover to use muted background, so that clickable rows have a clear affordance.
9. As a User, I want clicking a Bookmark row to open its URL in a new tab, so that I can visit the resource without losing my place in Cache.
10. As a User, I want action buttons on the right side of each row, so that Bookmark operations are easy to find.
11. As a User, I want to favorite or unfavorite a Bookmark, so that I can mark resources I care about.
12. As a User, I want to archive an active Bookmark, so that I can hide it from active use without deleting it.
13. As a User, I want to restore an Archived Bookmark, so that archived resources can return to active use.
14. As a User, I want to permanently delete a Bookmark, so that unwanted resources are removed from Cache.
15. As a User, I want action buttons to update the list immediately after a successful response, so that I can trust the UI state.
16. As a User, I want action failures surfaced clearly, so that I know when D1 was not changed.
17. As a User, I want the JSON inspector to remain available, so that I can verify UI actions against the returned Bookmark records.
18. As a User, I want sidebar filters for all, favorites, and archived Bookmarks to work, so that I can focus the list.
19. As a User, I want empty states for each filter, so that I understand whether there are no Bookmarks or no matching Bookmarks.
20. As a User, I want the existing Import dialog to keep working, so that I can add Bookmarks from pasted URLs.
21. As a User, I want imported Bookmarks to appear in the item list after Import, so that the page reflects the latest saved resources.
22. As an unauthenticated visitor, I want the sign-in flow to stay available, so that I can access the authenticated Bookmarks page.
23. As the system operator, I want the UI to use existing Bookmark CRUD routes, so that no new backend behavior is introduced for this UI pass.

## Implementation Decisions

- Use existing shadcn `Item`, `ItemGroup`, `ItemMedia`, `ItemContent`, `ItemTitle`, `ItemDescription`, and `ItemActions` primitives for rows.
- Keep the visual direction close to the reference images: spacious rows, strong title hierarchy, muted metadata, thin dividers, minimal chrome.
- Keep the app surface quiet and operational: no marketing hero, no dashboard card grid, no decorative backgrounds.
- Use 40x40 image slots. When `image_url` is null, render a stable fallback using the Bookmark hostname initial.
- Keep row click as the primary open action. Use `window.open(url, "_blank", "noopener,noreferrer")`.
- Use icon-only action buttons with accessible labels: favorite/unfavorite, archive/restore, delete.
- Stop event propagation inside action buttons so actions do not open the URL.
- Use `PATCH /api/bookmarks/:id` for favorite and archived state changes.
- Use `DELETE /api/bookmarks/:id` for permanent deletion.
- After every successful mutation, update local state from the response or remove the deleted Bookmark. The JSON inspector serializes the same local state.
- Wire sidebar filters to page state instead of leaving them visual-only.
- Keep JSON inspector visible on the Bookmarks page as a development/inspection tool.
- Do not introduce schema changes or new backend endpoints.

## Testing Decisions

Good tests assert external behavior rather than component internals. Existing frontend DOM testing infrastructure is not present, so this PRD focuses automated tests on server route behavior and pure display helpers, with manual browser verification for rendered layout and interactions.

- Add a HTTP route test proving `PATCH /api/bookmarks/:id` updates Bookmark flags for the owning User and returns the updated Bookmark.
- Add pure helper tests for display formatting if display logic is extracted from the React component.
- Keep existing import, delete, create, auth, validation, and persistence tests running.
- Run `npm run lint` after implementation.
- Manually verify in the browser that row hover, row open, action buttons, filters, Import refresh, and JSON inspector behavior work.

## Out of Scope

- Editing title, description, URL, or image in the UI.
- Bulk actions.
- Tags, folders, notes, search, or sort controls.
- Confirmation modal for delete.
- Toast system.
- New backend endpoints or schema changes.
- Hiding the JSON inspector behind a production-only flag.

## Further Notes

- Domain language stays strict: archive is reversible hiding; delete is permanent removal.
- `image_url` means the public URL for a **Bookmark Image** when one exists.
- The reference images show article/feed rows; Cache adapts that pattern to Bookmark actions and D1 inspection.

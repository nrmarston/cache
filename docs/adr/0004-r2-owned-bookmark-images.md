# ADR 0004: Cache-owned Bookmark Images in R2

## Status
Accepted

## Context
A **Bookmark** imported from a pasted URL can include remote `og:image` metadata. Previously Cache stored that remote URL directly, which hotlinked third-party images and made preview reliability depend on the source site.

## Decision
Cache copies supported imported images into the existing `bookmark-images` R2 bucket through the `IMAGES` binding and stores the resulting public R2 URL in `bookmarks.image_url`. Import remains resilient: if image fetch, validation, or R2 write fails, Cache still creates the **Bookmark** with no **Bookmark Image**. Image transformation/compression is deliberately deferred; this change establishes ownership and lifecycle first without adding Cloudflare Images/Image Resizing or another transform pipeline.

## Consequences
- `image_url` means a Cache-owned public image URL for new Imports, not the original remote `og:image`.
- Existing remote `image_url` values are not backfilled.
- Deleting a **Bookmark** deletes its Cache-owned R2 image; archiving keeps it.
- Local development uses the remote R2 bucket so returned `r2.dev` URLs point at objects that actually exist publicly.

# ADR 0005: Store Readable Content separately from Bookmarks

## Status
Accepted

## Context
A **Bookmark** can now preserve **Readable Content** when it is **Imported**. That content can be much larger than the **Bookmark Metadata** shown in normal lists, and extracting it reliably is harder than reading `<title>` or Open Graph tags.

## Decision
Store **Readable Content** in a separate `bookmark_contents` table keyed by Bookmark id, with cascade delete. Normal list and Import responses expose only summary fields (`has_readable_content`, `readable_content_length`), while Bookmark detail can include the full text. Use Mozilla Readability with a Worker-compatible DOM parser to extract the main readable text, cap stored text at 100,000 characters, and keep Import resilient when extraction or content storage fails.

## Consequences
- List responses stay small even when many Bookmarks have large stored content.
- Future search or reader features can build on stored text without backfilling this first step.
- New parser dependencies are part of the Import path and should remain covered by fixture-based extraction tests.

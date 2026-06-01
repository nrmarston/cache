# Cache

Cache is a personal bookmark manager for saved web resources.

## Language

**User**:
A person who owns saved web resources in Cache.

**Bookmark**:
A saved web resource owned by a **User**.

**Archived Bookmark**:
A bookmark hidden from active use without being permanently removed.
_Avoid_: Deleted bookmark

**Deleted Bookmark**:
A bookmark that has been permanently removed.
_Avoid_: Archived bookmark

## Relationships

- A **User** owns zero or more **Bookmarks**.
- A **Bookmark** belongs to exactly one **User**.
- An **Archived Bookmark** remains a **Bookmark**.
- A **Deleted Bookmark** is no longer available in Cache.

## Example dialogue

> **Dev:** "Should deleting a **Bookmark** set `archived`?"
> **Domain expert:** "No — archive it to hide it reversibly; delete it only when it should be permanently removed."

## Flagged ambiguities

- "Delete" and "archive" are distinct: archive is reversible hiding, delete is permanent removal.

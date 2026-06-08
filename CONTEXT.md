# Cache

Cache is a personal bookmark manager for saved web resources.

## Language

**User**:
An authenticated, approved person who owns saved web resources in Cache.
_Avoid_: Google account, provider account, unapproved visitor

**Bookmark**:
A saved web resource owned by a **User**.

**Archived Bookmark**:
A bookmark hidden from active use without being permanently removed.
_Avoid_: Deleted bookmark

**Deleted Bookmark**:
A bookmark that has been permanently removed.
_Avoid_: Archived bookmark

**Import** (verb):
Create a **Bookmark** from a pasted URL. The server fetches the page and derives **Bookmark Metadata** (title, description, image). Distinct from a manual create where the **User** supplies the fields.
_Avoid_: add, scrape

**Bookmark Metadata**:
The title, description, and image derived from a page when a **Bookmark** is **Imported**. Title falls back to the URL hostname when the page cannot be fetched or has no title.
_Avoid_: tags, preview

**Bookmark Image**:
A Cache-owned image for a **Bookmark**, copied from imported page metadata and stored by Cache.
_Avoid_: hotlinked image, remote `og:image`

**Readable Content**:
The main human-readable text extracted from a page when a **Bookmark** is **Imported**.
_Avoid_: article text, raw HTML, page text

## Relationships

- An approved Google sign-in creates a **User**.
- A **User** owns zero or more **Bookmarks**.
- A **Bookmark** belongs to exactly one **User**.
- Only owning **User** can view or change a **Bookmark**.
- An **Archived Bookmark** remains a **Bookmark**.
- A **Deleted Bookmark** is no longer available in Cache.
- **Importing** a URL a **User** already owns returns the existing **Bookmark** instead of creating a duplicate.
- A **Bookmark Image** belongs to exactly one **Bookmark**.
- A **Bookmark** can exist without a **Bookmark Image** when image copying fails or no source image exists.
- A **Bookmark** can exist without **Readable Content** when extraction fails, no readable text exists, or it was created before content capture existed.
- Deleting a **Bookmark** deletes its **Bookmark Image**.
- Deleting a **Bookmark** deletes its **Readable Content**.
- Archiving a **Bookmark** keeps its **Bookmark Image**.
- Archiving a **Bookmark** keeps its **Readable Content**.

## Example dialogue

> **Dev:** "Should deleting a **Bookmark** set `archived`?"
> **Domain expert:** "No — archive it to hide it reversibly; delete it only when it should be permanently removed."

## Flagged ambiguities

- "Delete" and "archive" are distinct: archive is reversible hiding, delete is permanent removal.
- "User ID" means Cache's canonical identity for an authenticated **User**, not a Google account ID or caller-supplied value.
- "Google account" is only a sign-in method; it is not automatically a **User** unless approved.
- `image_url` on a **Bookmark** means the public URL for its **Bookmark Image**, not the original remote `og:image`.
- "Article text" means **Readable Content** only when the saved resource has an extractable main body; **Bookmark** remains broader than articles.

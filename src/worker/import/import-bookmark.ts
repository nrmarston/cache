// M4: Import orchestration. Composes validate -> dedupe -> fetch -> extract ->
// insert. Any enrichment failure (timeout, non-HTML, missing title) falls back
// to `title = hostname` and still saves the Bookmark. The page fetcher is
// injectable so the service can be tested without the network.

import { bookmarkColumns, type Bookmark } from "../bookmarks-table";
import { validateImportUrl } from "./validate-url";
import { extractMetadata } from "./extract-metadata";
import { fetchPage, type FetchPageResult } from "./fetch-page";

export type PageFetcher = (url: string) => Promise<FetchPageResult>;

export type ImportBookmarkResult =
  | { ok: true; bookmark: Bookmark; duplicate: boolean }
  | { ok: false; error: string };

export async function importBookmark(
  db: D1Database,
  userId: string,
  rawUrl: string,
  fetchPageFn: PageFetcher = fetchPage,
): Promise<ImportBookmarkResult> {
  const validated = validateImportUrl(rawUrl);
  if (!validated.ok) {
    return { ok: false, error: validated.error };
  }

  const url = validated.value;
  const normalizedUrl = url.href;

  const existing = await db
    .prepare(
      `SELECT ${bookmarkColumns} FROM bookmarks WHERE user_id = ? AND url = ?`,
    )
    .bind(userId, normalizedUrl)
    .first<Bookmark>();

  if (existing) {
    return { ok: true, bookmark: existing, duplicate: true };
  }

  // Fall back to the hostname so a failed enrichment still yields an
  // identifiable Bookmark.
  let title = url.hostname;
  let description: string | null = null;
  let imageUrl: string | null = null;

  const fetched = await fetchPageFn(normalizedUrl);
  if (fetched.ok) {
    const metadata = await extractMetadata(fetched.html);
    if (metadata.title) title = metadata.title;
    if (metadata.description) description = metadata.description;
    if (metadata.image) imageUrl = metadata.image;
  }

  const id = crypto.randomUUID();

  await db
    .prepare(
      "INSERT INTO bookmarks (id, user_id, title, url, description, image_url, favorite, archived) VALUES (?, ?, ?, ?, ?, ?, 0, 0)",
    )
    .bind(id, userId, title, normalizedUrl, description, imageUrl)
    .run();

  const bookmark = await db
    .prepare(
      `SELECT ${bookmarkColumns} FROM bookmarks WHERE id = ? AND user_id = ?`,
    )
    .bind(id, userId)
    .first<Bookmark>();

  if (!bookmark) {
    return { ok: false, error: "Failed to load the imported bookmark" };
  }

  return { ok: true, bookmark, duplicate: false };
}

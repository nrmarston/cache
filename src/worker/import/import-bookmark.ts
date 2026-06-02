// M4: Import orchestration. Composes validate -> dedupe -> fetch -> extract ->
// insert. Any enrichment failure (timeout, non-HTML, missing title) falls back
// to `title = hostname` and still saves the Bookmark. The page fetcher is
// injectable so the service can be tested without the network.

import {
  createImportedBookmarkForUser,
  findBookmarkByUrlForUser,
  type Bookmark,
} from "../bookmarks/persistence";
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

  const existing = await findBookmarkByUrlForUser(db, userId, normalizedUrl);
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

  const bookmark = await createImportedBookmarkForUser(db, userId, {
    title,
    url: normalizedUrl,
    description,
    image_url: imageUrl,
  });

  return { ok: true, bookmark, duplicate: false };
}

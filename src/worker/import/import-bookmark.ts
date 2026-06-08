// M4: Import orchestration. Composes validate -> dedupe -> fetch -> extract ->
// insert. Any enrichment failure (timeout, non-HTML, missing title) falls back
// to `title = hostname` and still saves the Bookmark. The page fetcher is
// injectable so the service can be tested without the network.

import {
  createImportedBookmarkForUser,
  findBookmarkByUrlForUser,
  saveReadableContentForBookmark,
  updateBookmarkForUser,
  type Bookmark,
} from "../bookmarks/persistence";
import { validateImportUrl } from "./validate-url";
import { extractMetadata } from "./extract-metadata";
import {
  extractReadableContent,
  type ReadableContent,
} from "./extract-readable-content";
import { fetchPage, type FetchPageResult } from "./fetch-page";
import {
  copyBookmarkImage,
  type ImageFetcher,
} from "./copy-bookmark-image";

export type PageFetcher = (url: string) => Promise<FetchPageResult>;

export type ImportImageStorage = {
  bucket: R2Bucket;
  publicBaseUrl: string;
  fetchImage?: ImageFetcher;
};

export type ImportBookmarkResult =
  | { ok: true; bookmark: Bookmark; duplicate: boolean }
  | { ok: false; error: string };

export async function importBookmark(
  db: D1Database,
  userId: string,
  rawUrl: string,
  fetchPageFn: PageFetcher = fetchPage,
  imageStorage?: ImportImageStorage,
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
  let sourceImage: string | undefined;
  let readableContent: ReadableContent | null = null;

  const fetched = await fetchPageFn(normalizedUrl);
  if (fetched.ok) {
    const metadata = await extractMetadata(fetched.html);
    if (metadata.title) title = metadata.title;
    if (metadata.description) description = metadata.description;
    if (metadata.image) sourceImage = metadata.image;
    readableContent = extractReadableContent(fetched.html);
  }

  let bookmark = await createImportedBookmarkForUser(db, userId, {
    title,
    url: normalizedUrl,
    description,
    image_url: null,
  });

  if (readableContent) {
    try {
      await saveReadableContentForBookmark(db, bookmark.id, readableContent);
      bookmark = {
        ...bookmark,
        has_readable_content: true,
        readable_content_length: readableContent.length,
      };
    } catch {
      // Bookmark Import stays resilient even when content storage fails.
    }
  }

  if (sourceImage && imageStorage) {
    const copied = await copyBookmarkImage({
      bucket: imageStorage.bucket,
      publicBaseUrl: imageStorage.publicBaseUrl,
      bookmarkId: bookmark.id,
      pageUrl: normalizedUrl,
      sourceImage,
      fetchImage: imageStorage.fetchImage,
    });

    if (copied.ok) {
      const updated = await updateBookmarkForUser(db, bookmark.id, userId, {
        image_url: copied.imageUrl,
      });
      if (updated) bookmark = updated;
    }
  }

  return { ok: true, bookmark, duplicate: false };
}

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
  imageCopyTimeoutMs?: number;
  waitUntil?: (promise: Promise<unknown>) => void;
};

export type ImportBookmarkResult =
  | { ok: true; bookmark: Bookmark; duplicate: boolean }
  | { ok: false; error: string };

const DEFAULT_IMAGE_COPY_TIMEOUT_MS = 8000;
const IMAGE_COPY_TIMEOUT = Symbol("image-copy-timeout");

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
    if (!existing.image_url && imageStorage?.waitUntil) {
      imageStorage.waitUntil(
        copyImageForExistingBookmark(
          db,
          userId,
          existing.id,
          normalizedUrl,
          fetchPageFn,
          imageStorage,
        ).catch(() => null),
      );
    }

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
    const copyPromise = copyImageForBookmark(
      db,
      userId,
      {
        bucket: imageStorage.bucket,
        publicBaseUrl: imageStorage.publicBaseUrl,
        bookmarkId: bookmark.id,
        pageUrl: normalizedUrl,
        sourceImage,
        fetchImage: imageStorage.fetchImage,
      },
    ).catch(() => null);
    const copied = await copyImageWithinResponseBudget(
      copyPromise,
      imageStorage.imageCopyTimeoutMs ?? DEFAULT_IMAGE_COPY_TIMEOUT_MS,
    );

    if (copied === IMAGE_COPY_TIMEOUT) {
      imageStorage.waitUntil?.(copyPromise);
    }

    if (copied && copied !== IMAGE_COPY_TIMEOUT) {
      bookmark = copied;
    }
  }

  return { ok: true, bookmark, duplicate: false };
}

async function copyImageForBookmark(
  db: D1Database,
  userId: string,
  input: Parameters<typeof copyBookmarkImage>[0],
): Promise<Bookmark | null> {
  const copied = await copyBookmarkImage(input);
  if (!copied.ok) return null;

  return updateBookmarkForUser(db, input.bookmarkId, userId, {
    image_url: copied.imageUrl,
  });
}

async function copyImageForExistingBookmark(
  db: D1Database,
  userId: string,
  bookmarkId: string,
  normalizedUrl: string,
  fetchPageFn: PageFetcher,
  imageStorage: ImportImageStorage,
): Promise<Bookmark | null> {
  const fetched = await fetchPageFn(normalizedUrl);
  if (!fetched.ok) return null;

  const metadata = await extractMetadata(fetched.html);
  if (!metadata.image) return null;

  return copyImageForBookmark(db, userId, {
    bucket: imageStorage.bucket,
    publicBaseUrl: imageStorage.publicBaseUrl,
    bookmarkId,
    pageUrl: normalizedUrl,
    sourceImage: metadata.image,
    fetchImage: imageStorage.fetchImage,
  });
}

function copyImageWithinResponseBudget(
  promise: Promise<Bookmark | null>,
  timeoutMs: number,
): Promise<Bookmark | null | typeof IMAGE_COPY_TIMEOUT> {
  const timeout = new Promise<typeof IMAGE_COPY_TIMEOUT>((resolve) =>
    setTimeout(() => resolve(IMAGE_COPY_TIMEOUT), timeoutMs),
  );

  return Promise.race([promise, timeout]);
}

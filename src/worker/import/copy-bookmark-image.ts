import { validateImportUrl } from "./validate-url";

export type ImageFetcher = (url: string) => Promise<Response>;

export type CopyBookmarkImageInput = {
  bucket: R2Bucket;
  publicBaseUrl: string;
  bookmarkId: string;
  pageUrl: string;
  sourceImage: string;
  fetchImage?: ImageFetcher;
};

export type CopyBookmarkImageResult =
  | { ok: true; imageUrl: string }
  | { ok: false; error: string };

const TIMEOUT_MS = 5000;
const MAX_BYTES = 5_000_000;
const ALLOWED_TYPES = new Map([
  ["image/avif", "avif"],
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
  ["image/gif", "gif"],
]);

export async function copyBookmarkImage({
  bucket,
  publicBaseUrl,
  bookmarkId,
  pageUrl,
  sourceImage,
  fetchImage = defaultFetchImage,
}: CopyBookmarkImageInput): Promise<CopyBookmarkImageResult> {
  const sourceUrl = resolveSourceImageUrl(sourceImage, pageUrl);
  if (!sourceUrl) {
    return { ok: false, error: "Image URL is invalid" };
  }

  const validated = validateImportUrl(sourceUrl.href);
  if (!validated.ok) {
    return { ok: false, error: validated.error };
  }

  let response: Response;
  try {
    response = await fetchImage(validated.value.href);
  } catch {
    return { ok: false, error: "Could not reach the image" };
  }

  if (!response.ok) {
    return { ok: false, error: `Image responded with ${response.status}` };
  }

  const contentType = normalizeContentType(
    response.headers.get("content-type"),
  );
  const extension = ALLOWED_TYPES.get(contentType);
  if (!extension) {
    return { ok: false, error: "Image type is not supported" };
  }

  const bytes = await readCapped(response, MAX_BYTES);
  if (!bytes) {
    return { ok: false, error: "Could not read the image" };
  }

  const key = `bookmarks/${bookmarkId}/image.${extension}`;
  try {
    await bucket.put(key, bytes, {
      httpMetadata: {
        contentType,
      },
    });
  } catch {
    return { ok: false, error: "Could not store the image" };
  }

  return {
    ok: true,
    imageUrl: `${publicBaseUrl.replace(/\/+$/, "")}/${key}`,
  };
}

export function imageKeyFromPublicUrl(
  imageUrl: string | null,
  publicBaseUrl: string,
): string | null {
  if (!imageUrl) return null;

  const normalizedBase = `${publicBaseUrl.replace(/\/+$/, "")}/`;
  if (!imageUrl.startsWith(normalizedBase)) return null;

  const key = imageUrl.slice(normalizedBase.length);
  return key.length > 0 ? key : null;
}

function resolveSourceImageUrl(sourceImage: string, pageUrl: string): URL | null {
  try {
    return new URL(sourceImage, pageUrl);
  } catch {
    return null;
  }
}

function defaultFetchImage(url: string): Promise<Response> {
  return fetch(url, {
    method: "GET",
    redirect: "follow",
    signal: AbortSignal.timeout(TIMEOUT_MS),
    headers: {
      Accept: "image/avif,image/webp,image/png,image/jpeg,image/gif,image/*",
      "User-Agent":
        "CacheBookmarkBot/1.0 (+https://github.com; bookmark image importer)",
    },
  });
}

function normalizeContentType(contentType: string | null): string {
  return (contentType ?? "").split(";")[0]?.trim().toLowerCase() ?? "";
}

async function readCapped(
  response: Response,
  maxBytes: number,
): Promise<Uint8Array | null> {
  if (!response.body) return null;

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;

  try {
    while (total <= maxBytes) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      total += value.byteLength;
      if (total > maxBytes) return null;
    }
  } catch {
    return null;
  } finally {
    await reader.cancel().catch(() => {});
  }

  const merged = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.length;
  }

  return merged;
}

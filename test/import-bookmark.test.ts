import { env } from "cloudflare:test";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  importBookmark,
  type PageFetcher,
} from "../src/worker/import/import-bookmark";

const USER_ID = "user-1";

async function seedUser(id: string): Promise<void> {
  await env.DB.prepare(
    `INSERT OR IGNORE INTO "user" (id, name, email, emailVerified, createdAt, updatedAt)
     VALUES (?, ?, ?, 1, ?, ?)`,
  )
    .bind(id, "Test User", `${id}@example.com`, "2026-01-01", "2026-01-01")
    .run();
}

async function countBookmarks(userId: string): Promise<number> {
  const row = await env.DB.prepare(
    "SELECT COUNT(*) AS n FROM bookmarks WHERE user_id = ?",
  )
    .bind(userId)
    .first<{ n: number }>();
  return row?.n ?? 0;
}

describe("importBookmark", () => {
  beforeEach(async () => {
    await seedUser(USER_ID);
  });

  it("inserts a bookmark enriched from the page without hotlinking the remote image", async () => {
    const fetcher: PageFetcher = async () => ({
      ok: true,
      html: '<head><title>Example Title</title><meta name="description" content="Desc"><meta property="og:image" content="https://example.com/i.png"></head>',
    });

    const result = await importBookmark(
      env.DB,
      USER_ID,
      "https://example.com/article",
      fetcher,
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.duplicate).toBe(false);
    expect(result.bookmark.title).toBe("Example Title");
    expect(result.bookmark.description).toBe("Desc");
    expect(result.bookmark.image_url).toBeNull();
    expect(result.bookmark.url).toBe("https://example.com/article");
    expect(result.bookmark.favorite).toBe(0);
    expect(result.bookmark.archived).toBe(0);
  });

  it("stores readable content for a new imported bookmark", async () => {
    const fetcher: PageFetcher = async () => ({
      ok: true,
      html: `
        <html>
          <head><title>Readable Import</title></head>
          <body>
            <nav>Navigation should not be stored</nav>
            <article>
              <h1>Readable Import</h1>
              <p>First saved paragraph.</p>
              <p>Second saved paragraph.</p>
            </article>
          </body>
        </html>
      `,
    });

    const result = await importBookmark(
      env.DB,
      USER_ID,
      "https://example.com/readable-import",
      fetcher,
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.bookmark.has_readable_content).toBe(true);
    expect(result.bookmark.readable_content_length).toBeGreaterThan(0);

    const row = await env.DB.prepare(
      "SELECT readable_content, readable_content_length FROM bookmark_contents WHERE bookmark_id = ?",
    )
      .bind(result.bookmark.id)
      .first<{ readable_content: string; readable_content_length: number }>();

    expect(row).not.toBeNull();
    expect(row?.readable_content).toContain("First saved paragraph.");
    expect(row?.readable_content).toContain("Second saved paragraph.");
    expect(row?.readable_content).not.toContain(
      "Navigation should not be stored",
    );
    expect(row?.readable_content_length).toBe(row?.readable_content.length);
  });

  it("copies a supported og:image into R2 and stores the public URL", async () => {
    const fetcher: PageFetcher = async () => ({
      ok: true,
      html: '<head><title>Stored Image</title><meta property="og:image" content="/i.png"></head>',
    });
    const bucket = {
      put: vi.fn(async () => ({})),
    } as unknown as R2Bucket;
    const fetchImage = vi.fn(async () => {
      return new Response(new Uint8Array([1, 2, 3]), {
        headers: {
          "content-type": "image/png",
        },
      });
    });

    const result = await importBookmark(
      env.DB,
      USER_ID,
      "https://example.com/article-with-image",
      fetcher,
      {
        bucket,
        publicBaseUrl: "https://images.example.test",
        fetchImage,
      },
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(fetchImage).toHaveBeenCalledWith("https://example.com/i.png");
    expect(bucket.put).toHaveBeenCalledWith(
      `bookmarks/${result.bookmark.id}/image.png`,
      new Uint8Array([1, 2, 3]),
      {
        httpMetadata: {
          contentType: "image/png",
        },
      },
    );
    expect(result.bookmark.image_url).toBe(
      `https://images.example.test/bookmarks/${result.bookmark.id}/image.png`,
    );
  });

  it("copies AVIF og:image responses because the importer advertises AVIF support", async () => {
    const fetcher: PageFetcher = async () => ({
      ok: true,
      html: '<head><title>Stored AVIF Image</title><meta property="og:image" content="https://cdn.example.com/i.avif"></head>',
    });
    const bucket = {
      put: vi.fn(async () => ({})),
    } as unknown as R2Bucket;

    const result = await importBookmark(
      env.DB,
      USER_ID,
      "https://example.com/article-with-avif-image",
      fetcher,
      {
        bucket,
        publicBaseUrl: "https://images.example.test",
        fetchImage: async () =>
          new Response(new Uint8Array([1, 2, 3]), {
            headers: {
              "content-type": "image/avif",
            },
          }),
      },
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(bucket.put).toHaveBeenCalledWith(
      `bookmarks/${result.bookmark.id}/image.avif`,
      new Uint8Array([1, 2, 3]),
      {
        httpMetadata: {
          contentType: "image/avif",
        },
      },
    );
    expect(result.bookmark.image_url).toBe(
      `https://images.example.test/bookmarks/${result.bookmark.id}/image.avif`,
    );
  });

  it("returns the saved bookmark when optional image copying stalls", async () => {
    const fetcher: PageFetcher = async () => ({
      ok: true,
      html: '<head><title>Slow Image</title><meta property="og:image" content="https://cdn.example.com/slow.png"></head>',
    });
    const imageStorage = {
      bucket: {
        put: vi.fn(async () => ({})),
      } as unknown as R2Bucket,
      publicBaseUrl: "https://images.example.test",
      fetchImage: vi.fn(
        () =>
          new Promise<Response>(() => {
            // Intentionally never settles; Import should not wait forever for
            // optional Bookmark Image enrichment after the row is saved.
          }),
      ),
      imageCopyTimeoutMs: 1,
      waitUntil: vi.fn(),
    } as Parameters<typeof importBookmark>[4] & {
      imageCopyTimeoutMs: number;
      waitUntil: (promise: Promise<unknown>) => void;
    };

    const resultPromise = importBookmark(
      env.DB,
      USER_ID,
      "https://example.com/slow-image",
      fetcher,
      imageStorage,
    );

    const result = await Promise.race([
      resultPromise,
      new Promise<"timed-out">((resolve) =>
        setTimeout(() => resolve("timed-out"), 25),
      ),
    ]);

    expect(result).not.toBe("timed-out");
    if (result === "timed-out") return;
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.bookmark.title).toBe("Slow Image");
    expect(result.bookmark.image_url).toBeNull();
    expect(imageStorage.waitUntil).toHaveBeenCalledTimes(1);
  });

  it("continues a slow image copy after the response budget and stores the image URL", async () => {
    const fetcher: PageFetcher = async () => ({
      ok: true,
      html: '<head><title>Deferred Image</title><meta property="og:image" content="https://cdn.example.com/deferred.webp"></head>',
    });
    const deferred: Promise<unknown>[] = [];
    const bucket = {
      put: vi.fn(async () => ({})),
    } as unknown as R2Bucket;

    const result = await importBookmark(
      env.DB,
      USER_ID,
      "https://example.com/deferred-image",
      fetcher,
      {
        bucket,
        publicBaseUrl: "https://images.example.test",
        fetchImage: async () => {
          await new Promise((resolve) => setTimeout(resolve, 5));
          return new Response(new Uint8Array([1, 2, 3]), {
            headers: {
              "content-type": "image/webp",
            },
          });
        },
        imageCopyTimeoutMs: 1,
        waitUntil: (promise) => deferred.push(promise),
      },
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.bookmark.image_url).toBeNull();
    expect(deferred).toHaveLength(1);

    await deferred[0];

    const stored = await env.DB.prepare(
      "SELECT image_url FROM bookmarks WHERE id = ?",
    )
      .bind(result.bookmark.id)
      .first<{ image_url: string | null }>();

    expect(bucket.put).toHaveBeenCalledWith(
      `bookmarks/${result.bookmark.id}/image.webp`,
      new Uint8Array([1, 2, 3]),
      {
        httpMetadata: {
          contentType: "image/webp",
        },
      },
    );
    expect(stored?.image_url).toBe(
      `https://images.example.test/bookmarks/${result.bookmark.id}/image.webp`,
    );
  });

  it("falls back to the hostname when enrichment fails, still saving", async () => {
    const fetcher: PageFetcher = async () => ({ ok: false, error: "boom" });

    const result = await importBookmark(
      env.DB,
      USER_ID,
      "https://fallback.example.org/x",
      fetcher,
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.duplicate).toBe(false);
    expect(result.bookmark.title).toBe("fallback.example.org");
    expect(result.bookmark.description).toBeNull();
    expect(result.bookmark.image_url).toBeNull();
    expect(result.bookmark.has_readable_content).toBe(false);
    expect(result.bookmark.readable_content_length).toBe(0);
  });

  it("does not store a remote og:image URL when image copying is unavailable", async () => {
    const fetcher: PageFetcher = async () => ({
      ok: true,
      html: '<head><title>Remote image</title><meta property="og:image" content="https://cdn.example.com/i.png"></head>',
    });

    const result = await importBookmark(
      env.DB,
      USER_ID,
      "https://example.com/remote-image",
      fetcher,
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.bookmark.image_url).toBeNull();
  });

  it("still saves the bookmark when writing the image to R2 fails", async () => {
    const fetcher: PageFetcher = async () => ({
      ok: true,
      html: '<head><title>R2 failure</title><meta property="og:image" content="https://cdn.example.com/i.png"></head>',
    });
    const bucket = {
      put: vi.fn(async () => {
        throw new Error("R2 unavailable");
      }),
    } as unknown as R2Bucket;

    const result = await importBookmark(
      env.DB,
      USER_ID,
      "https://example.com/r2-failure",
      fetcher,
      {
        bucket,
        publicBaseUrl: "https://images.example.test",
        fetchImage: async () =>
          new Response(new Uint8Array([1]), {
            headers: {
              "content-type": "image/png",
            },
          }),
      },
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.bookmark.title).toBe("R2 failure");
    expect(result.bookmark.image_url).toBeNull();
  });

  it("returns the existing bookmark on a duplicate and inserts nothing", async () => {
    const fetcher = vi.fn<PageFetcher>(async () => ({
      ok: true,
      html: "<title>First</title>",
    }));

    const first = await importBookmark(
      env.DB,
      USER_ID,
      "https://dupe.example.com/",
      fetcher,
    );
    expect(first.ok).toBe(true);
    const countAfterFirst = await countBookmarks(USER_ID);

    const second = await importBookmark(
      env.DB,
      USER_ID,
      "https://dupe.example.com/",
      fetcher,
    );

    expect(second.ok).toBe(true);
    if (!second.ok) return;
    expect(second.duplicate).toBe(true);
    expect(second.bookmark.title).toBe("First");
    expect(await countBookmarks(USER_ID)).toBe(countAfterFirst);
    // Fetcher runs only for the first (non-duplicate) import.
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("retries missing image enrichment for a duplicate import without inserting", async () => {
    const first = await importBookmark(
      env.DB,
      USER_ID,
      "https://dupe-image.example.com/",
      async () => ({
        ok: true,
        html: "<title>First without image</title>",
      }),
    );
    expect(first.ok).toBe(true);
    if (!first.ok) return;

    const countAfterFirst = await countBookmarks(USER_ID);
    const deferred: Promise<unknown>[] = [];
    const bucket = {
      put: vi.fn(async () => ({})),
    } as unknown as R2Bucket;

    const second = await importBookmark(
      env.DB,
      USER_ID,
      "https://dupe-image.example.com/",
      async () => ({
        ok: true,
        html: '<head><title>Ignored duplicate title</title><meta property="og:image" content="https://cdn.example.com/dupe.webp"></head>',
      }),
      {
        bucket,
        publicBaseUrl: "https://images.example.test",
        fetchImage: async () =>
          new Response(new Uint8Array([1, 2, 3]), {
            headers: {
              "content-type": "image/webp",
            },
          }),
        waitUntil: (promise) => deferred.push(promise),
      },
    );

    expect(second.ok).toBe(true);
    if (!second.ok) return;
    expect(second.duplicate).toBe(true);
    expect(second.bookmark.id).toBe(first.bookmark.id);
    expect(second.bookmark.image_url).toBeNull();
    expect(await countBookmarks(USER_ID)).toBe(countAfterFirst);
    expect(deferred).toHaveLength(1);

    await deferred[0];

    const stored = await env.DB.prepare(
      "SELECT image_url FROM bookmarks WHERE id = ?",
    )
      .bind(first.bookmark.id)
      .first<{ image_url: string | null }>();

    expect(bucket.put).toHaveBeenCalledWith(
      `bookmarks/${first.bookmark.id}/image.webp`,
      new Uint8Array([1, 2, 3]),
      {
        httpMetadata: {
          contentType: "image/webp",
        },
      },
    );
    expect(stored?.image_url).toBe(
      `https://images.example.test/bookmarks/${first.bookmark.id}/image.webp`,
    );
  });

  it("rejects an invalid or blocked URL without inserting", async () => {
    const before = await countBookmarks(USER_ID);

    const result = await importBookmark(env.DB, USER_ID, "http://localhost/x");

    expect(result.ok).toBe(false);
    expect(await countBookmarks(USER_ID)).toBe(before);
  });
});

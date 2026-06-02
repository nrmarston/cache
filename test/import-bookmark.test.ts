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

  it("inserts a bookmark enriched from the page (duplicate:false)", async () => {
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
    expect(result.bookmark.image_url).toBe("https://example.com/i.png");
    expect(result.bookmark.url).toBe("https://example.com/article");
    expect(result.bookmark.favorite).toBe(0);
    expect(result.bookmark.archived).toBe(0);
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

  it("rejects an invalid or blocked URL without inserting", async () => {
    const before = await countBookmarks(USER_ID);

    const result = await importBookmark(env.DB, USER_ID, "http://localhost/x");

    expect(result.ok).toBe(false);
    expect(await countBookmarks(USER_ID)).toBe(before);
  });
});

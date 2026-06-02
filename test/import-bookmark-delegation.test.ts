import { afterEach, describe, expect, it, vi } from "vitest";

const USER_ID = "import-user-1";

afterEach(() => {
  vi.resetModules();
  vi.doUnmock("../src/worker/bookmarks/persistence");
});

describe("importBookmark persistence delegation", () => {
  it("returns an existing duplicate through bookmark persistence", async () => {
    const existingBookmark = {
      id: "bookmark-1",
      user_id: USER_ID,
      title: "Existing",
      url: "https://example.com/article",
      description: null,
      image_url: null,
      favorite: 0,
      archived: 0,
      created_at: "2026-01-01 00:00:00",
      updated_at: "2026-01-01 00:00:00",
    };

    const findBookmarkByUrlForUser = vi.fn(async () => existingBookmark);
    const createImportedBookmarkForUser = vi.fn();

    vi.doMock("../src/worker/bookmarks/persistence", () => ({
      findBookmarkByUrlForUser,
      createImportedBookmarkForUser,
      updateBookmarkForUser: vi.fn(),
    }));

    const { importBookmark } = await import("../src/worker/import/import-bookmark");
    const fetcher = vi.fn(async () => ({
      ok: true as const,
      html: "<title>Should not be used</title>",
    }));

    const result = await importBookmark(
      {} as D1Database,
      USER_ID,
      "https://example.com/article",
      fetcher,
    );

    expect(findBookmarkByUrlForUser).toHaveBeenCalledWith(
      {},
      USER_ID,
      "https://example.com/article",
    );
    expect(createImportedBookmarkForUser).not.toHaveBeenCalled();
    expect(fetcher).not.toHaveBeenCalled();
    expect(result).toEqual({
      ok: true,
      bookmark: existingBookmark,
      duplicate: true,
    });
  });

  it("creates a new imported bookmark through bookmark persistence", async () => {
    const findBookmarkByUrlForUser = vi.fn(async () => null);
    const createdBookmark = {
      id: "bookmark-2",
      user_id: USER_ID,
      title: "Fetched title",
      url: "https://example.com/new",
      description: "Fetched description",
      image_url: null,
      favorite: 0,
      archived: 0,
      created_at: "2026-01-01 00:00:00",
      updated_at: "2026-01-01 00:00:00",
    };
    const createImportedBookmarkForUser = vi.fn(async () => createdBookmark);

    vi.doMock("../src/worker/bookmarks/persistence", () => ({
      findBookmarkByUrlForUser,
      createImportedBookmarkForUser,
      updateBookmarkForUser: vi.fn(),
    }));

    const { importBookmark } = await import("../src/worker/import/import-bookmark");
    const fetcher = vi.fn(async () => ({
      ok: true as const,
      html: '<title>Fetched title</title><meta name="description" content="Fetched description"><meta property="og:image" content="https://example.com/image.png">',
    }));

    const result = await importBookmark(
      {} as D1Database,
      USER_ID,
      "https://example.com/new",
      fetcher,
    );

    expect(findBookmarkByUrlForUser).toHaveBeenCalledWith(
      {},
      USER_ID,
      "https://example.com/new",
    );
    expect(createImportedBookmarkForUser).toHaveBeenCalledWith({}, USER_ID, {
      title: "Fetched title",
      url: "https://example.com/new",
      description: "Fetched description",
      image_url: null,
    });
    expect(result).toEqual({
      ok: true,
      bookmark: createdBookmark,
      duplicate: false,
    });
  });
});

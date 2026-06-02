import { env } from "cloudflare:test";
import { beforeEach, describe, expect, it } from "vitest";

const USER_ID = "bookmark-user-1";
const OTHER_USER_ID = "bookmark-user-2";

async function seedUser(id: string): Promise<void> {
  await env.DB.prepare(
    `INSERT OR IGNORE INTO "user" (id, name, email, emailVerified, createdAt, updatedAt)
     VALUES (?, ?, ?, 1, ?, ?)`,
  )
    .bind(id, "Test User", `${id}@example.com`, "2026-01-01", "2026-01-01")
    .run();
}

async function seedBookmark(options: {
  id: string;
  userId: string;
  title: string;
  url: string;
  description?: string | null;
  imageUrl?: string | null;
  favorite?: number;
  archived?: number;
  createdAt?: string;
  updatedAt?: string;
}): Promise<void> {
  await env.DB.prepare(
    `INSERT INTO bookmarks
      (id, user_id, title, url, description, image_url, favorite, archived, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      options.id,
      options.userId,
      options.title,
      options.url,
      options.description ?? null,
      options.imageUrl ?? null,
      options.favorite ?? 0,
      options.archived ?? 0,
      options.createdAt ?? "2026-01-01 00:00:00",
      options.updatedAt ?? "2026-01-01 00:00:00",
    )
    .run();
}

describe("bookmark persistence", () => {
  beforeEach(async () => {
    await seedUser(USER_ID);
    await seedUser(OTHER_USER_ID);
  });

  it("lists only bookmarks owned by the requested user", async () => {
    const { createBookmarkForUser, listBookmarksForUser } = await import(
      "../src/worker/bookmarks/persistence"
    );

    const createdForUser = await createBookmarkForUser(env.DB, USER_ID, {
      title: "First user bookmark",
      url: "https://example.com/one",
      description: null,
      image_url: null,
      favorite: 0,
      archived: 0,
    });
    await createBookmarkForUser(env.DB, OTHER_USER_ID, {
      title: "Other user bookmark",
      url: "https://example.com/two",
      description: null,
      image_url: null,
      favorite: 0,
      archived: 0,
    });

    const bookmarks = await listBookmarksForUser(env.DB, USER_ID);

    expect(bookmarks).toHaveLength(1);
    expect(bookmarks[0]?.id).toBe(createdForUser.id);
    expect(bookmarks[0]?.user_id).toBe(USER_ID);
  });

  it("creates an active non-favorite bookmark by default when asked", async () => {
    const { createBookmarkForUser } = await import(
      "../src/worker/bookmarks/persistence"
    );

    const bookmark = await createBookmarkForUser(env.DB, USER_ID, {
      title: "Created bookmark",
      url: "https://example.com/created",
      description: null,
      image_url: null,
      favorite: 0,
      archived: 0,
    });

    expect(bookmark.user_id).toBe(USER_ID);
    expect(bookmark.title).toBe("Created bookmark");
    expect(bookmark.favorite).toBe(0);
    expect(bookmark.archived).toBe(0);
  });

  it("updates only the provided fields and changes updated_at", async () => {
    const { findBookmarkByIdForUser, updateBookmarkForUser } = await import(
      "../src/worker/bookmarks/persistence"
    );

    await seedBookmark({
      id: "bookmark-1",
      userId: USER_ID,
      title: "Before",
      url: "https://example.com/before",
      description: "before description",
      imageUrl: "https://example.com/before.png",
      favorite: 0,
      archived: 0,
      updatedAt: "2024-01-01 00:00:00",
    });

    const updated = await updateBookmarkForUser(env.DB, "bookmark-1", USER_ID, {
      title: "After",
      favorite: 1,
    });

    expect(updated?.title).toBe("After");
    expect(updated?.favorite).toBe(1);
    expect(updated?.url).toBe("https://example.com/before");
    expect(updated?.description).toBe("before description");
    expect(updated?.updated_at).not.toBe("2024-01-01 00:00:00");

    const stored = await findBookmarkByIdForUser(env.DB, "bookmark-1", USER_ID);
    expect(stored?.title).toBe("After");
    expect(stored?.favorite).toBe(1);
    expect(stored?.image_url).toBe("https://example.com/before.png");
  });

  it("does not update a bookmark owned by another user", async () => {
    const { findBookmarkByIdForUser, updateBookmarkForUser } = await import(
      "../src/worker/bookmarks/persistence"
    );

    await seedBookmark({
      id: "bookmark-2",
      userId: OTHER_USER_ID,
      title: "Other",
      url: "https://example.com/other",
    });

    const updated = await updateBookmarkForUser(env.DB, "bookmark-2", USER_ID, {
      title: "Should not change",
    });

    expect(updated).toBeNull();
    expect(await findBookmarkByIdForUser(env.DB, "bookmark-2", USER_ID)).toBeNull();
    expect(
      await findBookmarkByIdForUser(env.DB, "bookmark-2", OTHER_USER_ID),
    ).toMatchObject({
      title: "Other",
    });
  });

  it("permanently deletes only the owning user's bookmark", async () => {
    const { deleteBookmarkForUser, findBookmarkByIdForUser } = await import(
      "../src/worker/bookmarks/persistence"
    );

    await seedBookmark({
      id: "bookmark-3",
      userId: USER_ID,
      title: "Delete me",
      url: "https://example.com/delete-me",
      archived: 1,
    });
    await seedBookmark({
      id: "bookmark-4",
      userId: OTHER_USER_ID,
      title: "Keep me",
      url: "https://example.com/keep-me",
    });

    expect(await deleteBookmarkForUser(env.DB, "bookmark-3", USER_ID)).toBe(true);
    expect(await findBookmarkByIdForUser(env.DB, "bookmark-3", USER_ID)).toBeNull();
    expect(await deleteBookmarkForUser(env.DB, "bookmark-4", USER_ID)).toBe(false);
    expect(
      await findBookmarkByIdForUser(env.DB, "bookmark-4", OTHER_USER_ID),
    ).not.toBeNull();
  });
});

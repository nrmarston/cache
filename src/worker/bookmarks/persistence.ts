import type {
  CreateBookmarkInput,
  UpdateBookmarkInput,
} from "./request-contract";

export type Bookmark = {
  id: string;
  user_id: string;
  title: string;
  url: string;
  description: string | null;
  image_url: string | null;
  favorite: number;
  archived: number;
  created_at: string;
  updated_at: string;
};

const bookmarkColumns =
  "id, user_id, title, url, description, image_url, favorite, archived, created_at, updated_at";

type ImportedBookmarkInput = {
  title: string;
  url: string;
  description: string | null;
  image_url: string | null;
};

async function findBookmarkById(
  db: D1Database,
  bookmarkId: string,
  userId: string,
): Promise<Bookmark | null> {
  return db
    .prepare(
      `SELECT ${bookmarkColumns} FROM bookmarks WHERE id = ? AND user_id = ?`,
    )
    .bind(bookmarkId, userId)
    .first<Bookmark>();
}

async function loadCreatedBookmark(
  db: D1Database,
  bookmarkId: string,
  userId: string,
): Promise<Bookmark> {
  const bookmark = await findBookmarkById(db, bookmarkId, userId);

  if (!bookmark) {
    throw new Error("Failed to load bookmark");
  }

  return bookmark;
}

export async function listBookmarksForUser(
  db: D1Database,
  userId: string,
): Promise<Bookmark[]> {
  const { results } = await db
    .prepare(
      `SELECT ${bookmarkColumns} FROM bookmarks WHERE user_id = ? ORDER BY created_at DESC`,
    )
    .bind(userId)
    .all<Bookmark>();

  return results;
}

export async function findBookmarkByIdForUser(
  db: D1Database,
  bookmarkId: string,
  userId: string,
): Promise<Bookmark | null> {
  return findBookmarkById(db, bookmarkId, userId);
}

export async function createBookmarkForUser(
  db: D1Database,
  userId: string,
  input: CreateBookmarkInput,
): Promise<Bookmark> {
  const bookmarkId = crypto.randomUUID();

  await db
    .prepare(
      "INSERT INTO bookmarks (id, user_id, title, url, description, image_url, favorite, archived) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    )
    .bind(
      bookmarkId,
      userId,
      input.title,
      input.url,
      input.description,
      input.image_url,
      input.favorite,
      input.archived,
    )
    .run();

  return loadCreatedBookmark(db, bookmarkId, userId);
}

export async function updateBookmarkForUser(
  db: D1Database,
  bookmarkId: string,
  userId: string,
  input: UpdateBookmarkInput,
): Promise<Bookmark | null> {
  const assignments: string[] = [];
  const values: Array<string | number | null> = [];

  if (input.title !== undefined) {
    assignments.push("title = ?");
    values.push(input.title);
  }

  if (input.url !== undefined) {
    assignments.push("url = ?");
    values.push(input.url);
  }

  if (input.description !== undefined) {
    assignments.push("description = ?");
    values.push(input.description);
  }

  if (input.image_url !== undefined) {
    assignments.push("image_url = ?");
    values.push(input.image_url);
  }

  if (input.favorite !== undefined) {
    assignments.push("favorite = ?");
    values.push(input.favorite);
  }

  if (input.archived !== undefined) {
    assignments.push("archived = ?");
    values.push(input.archived);
  }

  if (assignments.length === 0) {
    return findBookmarkById(db, bookmarkId, userId);
  }

  await db
    .prepare(
      `UPDATE bookmarks SET ${assignments.join(
        ", ",
      )}, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?`,
    )
    .bind(...values, bookmarkId, userId)
    .run();

  return findBookmarkById(db, bookmarkId, userId);
}

export async function deleteBookmarkForUser(
  db: D1Database,
  bookmarkId: string,
  userId: string,
): Promise<boolean> {
  const result = await db
    .prepare("DELETE FROM bookmarks WHERE id = ? AND user_id = ?")
    .bind(bookmarkId, userId)
    .run();

  return (result.meta.changes ?? 0) > 0;
}

export async function findBookmarkByUrlForUser(
  db: D1Database,
  userId: string,
  url: string,
): Promise<Bookmark | null> {
  return db
    .prepare(
      `SELECT ${bookmarkColumns} FROM bookmarks WHERE user_id = ? AND url = ?`,
    )
    .bind(userId, url)
    .first<Bookmark>();
}

export async function createImportedBookmarkForUser(
  db: D1Database,
  userId: string,
  input: ImportedBookmarkInput,
): Promise<Bookmark> {
  const bookmarkId = crypto.randomUUID();

  await db
    .prepare(
      "INSERT INTO bookmarks (id, user_id, title, url, description, image_url, favorite, archived) VALUES (?, ?, ?, ?, ?, ?, 0, 0)",
    )
    .bind(
      bookmarkId,
      userId,
      input.title,
      input.url,
      input.description,
      input.image_url,
    )
    .run();

  return loadCreatedBookmark(db, bookmarkId, userId);
}

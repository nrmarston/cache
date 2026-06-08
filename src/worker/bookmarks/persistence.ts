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
  has_readable_content: boolean;
  readable_content_length: number;
};

export type BookmarkDetail = Bookmark & {
  readable_content: string | null;
};

type BookmarkRow = Omit<Bookmark, "has_readable_content"> & {
  has_readable_content: number;
};

type BookmarkDetailRow = BookmarkRow & {
  readable_content: string | null;
};

const bookmarkSummaryColumns =
  "b.id, b.user_id, b.title, b.url, b.description, b.image_url, b.favorite, b.archived, b.created_at, b.updated_at, CASE WHEN bc.bookmark_id IS NULL THEN 0 ELSE 1 END AS has_readable_content, COALESCE(bc.readable_content_length, 0) AS readable_content_length";

type ImportedBookmarkInput = {
  title: string;
  url: string;
  description: string | null;
  image_url: string | null;
};

type ReadableContentInput = {
  content: string;
  length: number;
};

function toBookmark(row: BookmarkRow): Bookmark {
  return {
    ...row,
    has_readable_content: row.has_readable_content === 1,
  };
}

function toBookmarkDetail(row: BookmarkDetailRow): BookmarkDetail {
  return {
    ...row,
    has_readable_content: row.has_readable_content === 1,
  };
}

async function findBookmarkSummaryById(
  db: D1Database,
  bookmarkId: string,
  userId: string,
): Promise<Bookmark | null> {
  const row = await db
    .prepare(
      `SELECT ${bookmarkSummaryColumns}
       FROM bookmarks b
       LEFT JOIN bookmark_contents bc ON bc.bookmark_id = b.id
       WHERE b.id = ? AND b.user_id = ?`,
    )
    .bind(bookmarkId, userId)
    .first<BookmarkRow>();

  return row ? toBookmark(row) : null;
}

async function loadCreatedBookmark(
  db: D1Database,
  bookmarkId: string,
  userId: string,
): Promise<Bookmark> {
  const bookmark = await findBookmarkSummaryById(db, bookmarkId, userId);

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
      `SELECT ${bookmarkSummaryColumns}
       FROM bookmarks b
       LEFT JOIN bookmark_contents bc ON bc.bookmark_id = b.id
       WHERE b.user_id = ?
       ORDER BY b.created_at DESC`,
    )
    .bind(userId)
    .all<BookmarkRow>();

  return results.map(toBookmark);
}

export async function findBookmarkByIdForUser(
  db: D1Database,
  bookmarkId: string,
  userId: string,
): Promise<BookmarkDetail | null> {
  const row = await db
    .prepare(
      `SELECT ${bookmarkSummaryColumns}, bc.readable_content
       FROM bookmarks b
       LEFT JOIN bookmark_contents bc ON bc.bookmark_id = b.id
       WHERE b.id = ? AND b.user_id = ?`,
    )
    .bind(bookmarkId, userId)
    .first<BookmarkDetailRow>();

  return row ? toBookmarkDetail(row) : null;
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
    return findBookmarkSummaryById(db, bookmarkId, userId);
  }

  await db
    .prepare(
      `UPDATE bookmarks SET ${assignments.join(
        ", ",
      )}, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?`,
    )
    .bind(...values, bookmarkId, userId)
    .run();

  return findBookmarkSummaryById(db, bookmarkId, userId);
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
  const row = await db
    .prepare(
      `SELECT ${bookmarkSummaryColumns}
       FROM bookmarks b
       LEFT JOIN bookmark_contents bc ON bc.bookmark_id = b.id
       WHERE b.user_id = ? AND b.url = ?`,
    )
    .bind(userId, url)
    .first<BookmarkRow>();

  return row ? toBookmark(row) : null;
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

export async function saveReadableContentForBookmark(
  db: D1Database,
  bookmarkId: string,
  input: ReadableContentInput,
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO bookmark_contents
        (bookmark_id, readable_content, readable_content_length)
       VALUES (?, ?, ?)`,
    )
    .bind(bookmarkId, input.content, input.length)
    .run();
}

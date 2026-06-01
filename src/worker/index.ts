import { Hono } from "hono";

const app = new Hono<{ Bindings: Env }>();

export interface Env {
  DB: D1Database;
}

type Bookmark = {
  id: string;
  user_id: string;
  title: string;
  url: string;
  description: string | null;
  image_path: string | null;
  favorite: number;
  archived: number;
  created_at: string;
  updated_at: string;
};

type CreateBookmarkInput = {
  user_id: string;
  title: string;
  url: string;
  description: string | null;
  image_path: string | null;
  favorite: number;
  archived: number;
};

type UpdateBookmarkInput = Partial<{
  title: string;
  url: string;
  description: string | null;
  image_path: string | null;
  favorite: number;
  archived: number;
}>;

type ValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: string };

const bookmarkColumns =
  "id, user_id, title, url, description, image_path, favorite, archived, created_at, updated_at";

const createFields = new Set([
  "user_id",
  "title",
  "url",
  "description",
  "image_path",
  "favorite",
  "archived",
]);

const updateFields = new Set([
  "title",
  "url",
  "description",
  "image_path",
  "favorite",
  "archived",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function rejectUnknownFields(
  body: Record<string, unknown>,
  allowedFields: Set<string>,
): ValidationResult<void> {
  const unknownFields = Object.keys(body).filter(
    (field) => !allowedFields.has(field),
  );

  if (unknownFields.length > 0) {
    return {
      ok: false,
      error: `Unknown field: ${unknownFields[0]}`,
    };
  }

  return { ok: true, value: undefined };
}

function requiredString(
  body: Record<string, unknown>,
  field: string,
): ValidationResult<string> {
  const value = body[field];

  if (typeof value !== "string" || value.trim().length === 0) {
    return { ok: false, error: `${field} must be a non-empty string` };
  }

  return { ok: true, value: value.trim() };
}

function optionalNullableString(
  body: Record<string, unknown>,
  field: string,
): ValidationResult<string | null> {
  const value = body[field];

  if (value === undefined || value === null) {
    return { ok: true, value: null };
  }

  if (typeof value !== "string") {
    return { ok: false, error: `${field} must be a string or null` };
  }

  return { ok: true, value };
}

function optionalFlag(
  body: Record<string, unknown>,
  field: string,
): ValidationResult<number> {
  const value = body[field];

  if (value === undefined) {
    return { ok: true, value: 0 };
  }

  return flag(value, field);
}

function flag(value: unknown, field: string): ValidationResult<number> {
  if (typeof value === "boolean") {
    return { ok: true, value: value ? 1 : 0 };
  }

  if (value === 0 || value === 1) {
    return { ok: true, value };
  }

  return { ok: false, error: `${field} must be a boolean or 0/1` };
}

function validateUrl(url: string): ValidationResult<string> {
  try {
    new URL(url);
    return { ok: true, value: url };
  } catch {
    return { ok: false, error: "url must be a valid URL" };
  }
}

function validateCreateBookmark(
  body: unknown,
): ValidationResult<CreateBookmarkInput> {
  if (!isRecord(body)) {
    return { ok: false, error: "Request body must be an object" };
  }

  const unknownFields = rejectUnknownFields(body, createFields);
  if (!unknownFields.ok) return unknownFields;

  const userId = requiredString(body, "user_id");
  if (!userId.ok) return userId;

  const title = requiredString(body, "title");
  if (!title.ok) return title;

  const url = requiredString(body, "url");
  if (!url.ok) return url;

  const validUrl = validateUrl(url.value);
  if (!validUrl.ok) return validUrl;

  const description = optionalNullableString(body, "description");
  if (!description.ok) return description;

  const imagePath = optionalNullableString(body, "image_path");
  if (!imagePath.ok) return imagePath;

  const favorite = optionalFlag(body, "favorite");
  if (!favorite.ok) return favorite;

  const archived = optionalFlag(body, "archived");
  if (!archived.ok) return archived;

  return {
    ok: true,
    value: {
      user_id: userId.value,
      title: title.value,
      url: validUrl.value,
      description: description.value,
      image_path: imagePath.value,
      favorite: favorite.value,
      archived: archived.value,
    },
  };
}

function validateUpdateBookmark(
  body: unknown,
): ValidationResult<UpdateBookmarkInput> {
  if (!isRecord(body)) {
    return { ok: false, error: "Request body must be an object" };
  }

  const unknownFields = rejectUnknownFields(body, updateFields);
  if (!unknownFields.ok) return unknownFields;

  if (Object.keys(body).length === 0) {
    return { ok: false, error: "At least one field is required" };
  }

  const input: UpdateBookmarkInput = {};

  if (body.title !== undefined) {
    const title = requiredString(body, "title");
    if (!title.ok) return title;
    input.title = title.value;
  }

  if (body.url !== undefined) {
    const url = requiredString(body, "url");
    if (!url.ok) return url;

    const validUrl = validateUrl(url.value);
    if (!validUrl.ok) return validUrl;

    input.url = validUrl.value;
  }

  if (body.description !== undefined) {
    const description = optionalNullableString(body, "description");
    if (!description.ok) return description;
    input.description = description.value;
  }

  if (body.image_path !== undefined) {
    const imagePath = optionalNullableString(body, "image_path");
    if (!imagePath.ok) return imagePath;
    input.image_path = imagePath.value;
  }

  if (body.favorite !== undefined) {
    const favorite = flag(body.favorite, "favorite");
    if (!favorite.ok) return favorite;
    input.favorite = favorite.value;
  }

  if (body.archived !== undefined) {
    const archived = flag(body.archived, "archived");
    if (!archived.ok) return archived;
    input.archived = archived.value;
  }

  return { ok: true, value: input };
}

async function findBookmark(
  db: D1Database,
  id: string,
): Promise<Bookmark | null> {
  return db
    .prepare(`SELECT ${bookmarkColumns} FROM bookmarks WHERE id = ?`)
    .bind(id)
    .first<Bookmark>();
}

app.get("/health", (c) => c.json({ status: "ok" }));

app.get("/api/", (c) => c.json({ name: "Cache" }));

app.get("/api/bookmarks", async (c) => {
  const userId = c.req.query("user_id");

  const query = userId
    ? c.env.DB.prepare(
        `SELECT ${bookmarkColumns} FROM bookmarks WHERE user_id = ? ORDER BY created_at DESC`,
      ).bind(userId)
    : c.env.DB.prepare(
        `SELECT ${bookmarkColumns} FROM bookmarks ORDER BY created_at DESC`,
      );

  const { results } = await query.all<Bookmark>();

  return c.json(results);
});

app.post("/api/bookmarks", async (c) => {
  const body = await c.req.json<unknown>().catch(() => null);
  const input = validateCreateBookmark(body);

  if (!input.ok) {
    return c.json({ error: input.error }, 400);
  }

  const id = crypto.randomUUID();

  await c.env.DB.prepare(
    "INSERT INTO bookmarks (id, user_id, title, url, description, image_path, favorite, archived) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
  )
    .bind(
      id,
      input.value.user_id,
      input.value.title,
      input.value.url,
      input.value.description,
      input.value.image_path,
      input.value.favorite,
      input.value.archived,
    )
    .run();

  const bookmark = await findBookmark(c.env.DB, id);

  return c.json(bookmark, 201);
});

app.get("/api/bookmarks/:id", async (c) => {
  const bookmark = await findBookmark(c.env.DB, c.req.param("id"));

  if (!bookmark) {
    return c.json({ error: "Bookmark not found" }, 404);
  }

  return c.json(bookmark);
});

app.patch("/api/bookmarks/:id", async (c) => {
  const id = c.req.param("id");
  const bookmark = await findBookmark(c.env.DB, id);

  if (!bookmark) {
    return c.json({ error: "Bookmark not found" }, 404);
  }

  const body = await c.req.json<unknown>().catch(() => null);
  const input = validateUpdateBookmark(body);

  if (!input.ok) {
    return c.json({ error: input.error }, 400);
  }

  const assignments: string[] = [];
  const values: Array<string | number | null> = [];

  if (input.value.title !== undefined) {
    assignments.push("title = ?");
    values.push(input.value.title);
  }

  if (input.value.url !== undefined) {
    assignments.push("url = ?");
    values.push(input.value.url);
  }

  if (input.value.description !== undefined) {
    assignments.push("description = ?");
    values.push(input.value.description);
  }

  if (input.value.image_path !== undefined) {
    assignments.push("image_path = ?");
    values.push(input.value.image_path);
  }

  if (input.value.favorite !== undefined) {
    assignments.push("favorite = ?");
    values.push(input.value.favorite);
  }

  if (input.value.archived !== undefined) {
    assignments.push("archived = ?");
    values.push(input.value.archived);
  }

  await c.env.DB.prepare(
    `UPDATE bookmarks SET ${assignments.join(
      ", ",
    )}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
  )
    .bind(...values, id)
    .run();

  const updatedBookmark = await findBookmark(c.env.DB, id);

  return c.json(updatedBookmark);
});

app.delete("/api/bookmarks/:id", async (c) => {
  const id = c.req.param("id");
  const bookmark = await findBookmark(c.env.DB, id);

  if (!bookmark) {
    return c.json({ error: "Bookmark not found" }, 404);
  }

  await c.env.DB.prepare("DELETE FROM bookmarks WHERE id = ?").bind(id).run();

  return c.body(null, 204);
});

app.notFound((c) => c.json({ error: "Not found" }, 404));

export default app;

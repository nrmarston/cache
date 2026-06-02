import { Hono } from "hono";
import type { MiddlewareHandler } from "hono";
import { createAuth, isApprovedEmail } from "./auth";
import type { Env } from "./auth";
import { bookmarkColumns, type Bookmark } from "./bookmarks-table";
import { importBookmark } from "./import/import-bookmark";

type Variables = {
  userId: string;
};

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

type CreateBookmarkInput = {
  title: string;
  url: string;
  description: string | null;
  image_url: string | null;
  favorite: number;
  archived: number;
};

type UpdateBookmarkInput = Partial<{
  title: string;
  url: string;
  description: string | null;
  image_url: string | null;
  favorite: number;
  archived: number;
}>;

type ValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: string };

const createFields = new Set([
  "title",
  "url",
  "description",
  "image_url",
  "favorite",
  "archived",
]);

const updateFields = new Set([
  "title",
  "url",
  "description",
  "image_url",
  "favorite",
  "archived",
]);

const importFields = new Set(["url"]);

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

  const title = requiredString(body, "title");
  if (!title.ok) return title;

  const url = requiredString(body, "url");
  if (!url.ok) return url;

  const validUrl = validateUrl(url.value);
  if (!validUrl.ok) return validUrl;

  const description = optionalNullableString(body, "description");
  if (!description.ok) return description;

  const imageUrl = optionalNullableString(body, "image_url");
  if (!imageUrl.ok) return imageUrl;

  const favorite = optionalFlag(body, "favorite");
  if (!favorite.ok) return favorite;

  const archived = optionalFlag(body, "archived");
  if (!archived.ok) return archived;

  return {
    ok: true,
    value: {
      title: title.value,
      url: validUrl.value,
      description: description.value,
      image_url: imageUrl.value,
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

  if (body.image_url !== undefined) {
    const imageUrl = optionalNullableString(body, "image_url");
    if (!imageUrl.ok) return imageUrl;
    input.image_url = imageUrl.value;
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

function validateImportBody(body: unknown): ValidationResult<{ url: string }> {
  if (!isRecord(body)) {
    return { ok: false, error: "Request body must be an object" };
  }

  const unknownFields = rejectUnknownFields(body, importFields);
  if (!unknownFields.ok) return unknownFields;

  const url = requiredString(body, "url");
  if (!url.ok) return url;

  return { ok: true, value: { url: url.value } };
}

async function findBookmark(
  db: D1Database,
  id: string,
  userId: string,
): Promise<Bookmark | null> {
  return db
    .prepare(
      `SELECT ${bookmarkColumns} FROM bookmarks WHERE id = ? AND user_id = ?`,
    )
    .bind(id, userId)
    .first<Bookmark>();
}

app.get("/health", (c) => c.json({ status: "ok" }));

app.get("/api/", (c) => c.json({ name: "Cache" }));


// Auth middleware for all bookmark routes
const bookmarkAuth: MiddlewareHandler<{ Bindings: Env; Variables: Variables }> =
  async (c, next) => {
    const auth = createAuth(c.env);
    const session = await auth.api.getSession({ headers: c.req.raw.headers });

    if (!session) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    if (!isApprovedEmail(session.user.email, c.env)) {
      return c.json({ error: "Forbidden" }, 403);
    }

    c.set("userId", session.user.id);
    await next();
  };

app.use("/api/bookmarks", bookmarkAuth);
app.use("/api/bookmarks/*", bookmarkAuth);

app.get("/api/bookmarks", async (c) => {
  const userId = c.get("userId");

  const { results } = await c.env.DB.prepare(
    `SELECT ${bookmarkColumns} FROM bookmarks WHERE user_id = ? ORDER BY created_at DESC`,
  )
    .bind(userId)
    .all<Bookmark>();

  return c.json(results);
});

app.post("/api/bookmarks", async (c) => {
  const body = await c.req.json<unknown>().catch(() => null);
  const input = validateCreateBookmark(body);

  if (!input.ok) {
    return c.json({ error: input.error }, 400);
  }

  const id = crypto.randomUUID();
  const userId = c.get("userId");

  await c.env.DB.prepare(
    "INSERT INTO bookmarks (id, user_id, title, url, description, image_url, favorite, archived) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
  )
    .bind(
      id,
      userId,
      input.value.title,
      input.value.url,
      input.value.description,
      input.value.image_url,
      input.value.favorite,
      input.value.archived,
    )
    .run();

  const bookmark = await findBookmark(c.env.DB, id, userId);

  return c.json(bookmark, 201);
});

app.post("/api/bookmarks/import", async (c) => {
  const body = await c.req.json<unknown>().catch(() => null);
  const input = validateImportBody(body);

  if (!input.ok) {
    return c.json({ error: input.error }, 400);
  }

  const result = await importBookmark(
    c.env.DB,
    c.get("userId"),
    input.value.url,
  );

  if (!result.ok) {
    return c.json({ error: result.error }, 400);
  }

  return c.json(result.bookmark, result.duplicate ? 200 : 201);
});

app.get("/api/bookmarks/:id", async (c) => {
  const bookmark = await findBookmark(
    c.env.DB,
    c.req.param("id"),
    c.get("userId"),
  );

  if (!bookmark) {
    return c.json({ error: "Bookmark not found" }, 404);
  }

  return c.json(bookmark);
});

app.patch("/api/bookmarks/:id", async (c) => {
  const id = c.req.param("id");
  const userId = c.get("userId");
  const bookmark = await findBookmark(c.env.DB, id, userId);

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

  if (input.value.image_url !== undefined) {
    assignments.push("image_url = ?");
    values.push(input.value.image_url);
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
    )}, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?`,
  )
    .bind(...values, id, userId)
    .run();

  const updatedBookmark = await findBookmark(c.env.DB, id, userId);

  return c.json(updatedBookmark);
});

app.delete("/api/bookmarks/:id", async (c) => {
  const id = c.req.param("id");
  const userId = c.get("userId");
  const bookmark = await findBookmark(c.env.DB, id, userId);

  if (!bookmark) {
    return c.json({ error: "Bookmark not found" }, 404);
  }

  await c.env.DB.prepare(
    "DELETE FROM bookmarks WHERE id = ? AND user_id = ?",
  )
    .bind(id, userId)
    .run();

  return c.body(null, 204);
});

app.notFound((c) => c.json({ error: "Not found" }, 404));

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    const url = new URL(request.url);
    if (url.pathname.startsWith("/api/auth/")) {
      const auth = createAuth(env);
      return auth.handler(request);
    }
    return app.fetch(request, env, ctx);
  },
} satisfies ExportedHandler<Env>;

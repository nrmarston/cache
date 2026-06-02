import { Hono } from "hono";
import type { MiddlewareHandler } from "hono";
import { createAuth, isApprovedEmail } from "./auth";
import type { Env } from "./auth";
import {
  createBookmarkForUser,
  deleteBookmarkForUser,
  findBookmarkByIdForUser,
  listBookmarksForUser,
  updateBookmarkForUser,
} from "./bookmarks/persistence";
import {
  validateCreateBookmarkRequest,
  validateImportBookmarkRequest,
  validateUpdateBookmarkRequest,
} from "./bookmarks/request-contract";
import { importBookmark } from "./import/import-bookmark";

type Variables = {
  userId: string;
};

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

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
  return c.json(await listBookmarksForUser(c.env.DB, c.get("userId")));
});

app.post("/api/bookmarks", async (c) => {
  const body = await c.req.json<unknown>().catch(() => null);
  const input = validateCreateBookmarkRequest(body);

  if (!input.ok) {
    return c.json({ error: input.error }, 400);
  }

  const bookmark = await createBookmarkForUser(
    c.env.DB,
    c.get("userId"),
    input.value,
  );

  return c.json(bookmark, 201);
});

app.post("/api/bookmarks/import", async (c) => {
  const body = await c.req.json<unknown>().catch(() => null);
  const input = validateImportBookmarkRequest(body);

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
  const bookmark = await findBookmarkByIdForUser(
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
  const bookmark = await findBookmarkByIdForUser(c.env.DB, id, userId);

  if (!bookmark) {
    return c.json({ error: "Bookmark not found" }, 404);
  }

  const body = await c.req.json<unknown>().catch(() => null);
  const input = validateUpdateBookmarkRequest(body);

  if (!input.ok) {
    return c.json({ error: input.error }, 400);
  }

  const updatedBookmark = await updateBookmarkForUser(
    c.env.DB,
    id,
    userId,
    input.value,
  );

  return c.json(updatedBookmark);
});

app.delete("/api/bookmarks/:id", async (c) => {
  const id = c.req.param("id");
  const userId = c.get("userId");
  const bookmark = await findBookmarkByIdForUser(c.env.DB, id, userId);

  if (!bookmark) {
    return c.json({ error: "Bookmark not found" }, 404);
  }

  await deleteBookmarkForUser(c.env.DB, id, userId);

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

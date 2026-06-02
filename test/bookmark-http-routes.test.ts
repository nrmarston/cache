import { createExecutionContext, env } from "cloudflare:test";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Env } from "../src/worker/auth";

const USER_ID = "route-user-1";
const APPROVED_EMAIL = "route-user@example.com";

type Session =
  | {
      user: {
        id: string;
        email: string;
      };
    }
  | null;

async function seedUser(id: string, email: string): Promise<void> {
  await env.DB.prepare(
    `INSERT OR IGNORE INTO "user" (id, name, email, emailVerified, createdAt, updatedAt)
     VALUES (?, ?, ?, 1, ?, ?)`,
  )
    .bind(id, "Route User", email, "2026-01-01", "2026-01-01")
    .run();
}

async function seedBookmark(id: string, userId: string): Promise<void> {
  await env.DB.prepare(
    `INSERT INTO bookmarks
      (id, user_id, title, url, description, image_url, favorite, archived, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, 0, 0, ?, ?)`,
  )
    .bind(
      id,
      userId,
      "Seeded bookmark",
      `https://example.com/${id}`,
      null,
      null,
      "2026-01-01 00:00:00",
      "2026-01-01 00:00:00",
    )
    .run();
}

function buildEnv(): Env {
  return {
    ...env,
    ALLOWED_EMAILS: APPROVED_EMAIL,
    BETTER_AUTH_SECRET: "secret",
    BETTER_AUTH_URL: "https://cache.test",
    GOOGLE_CLIENT_ID: "client-id",
    GOOGLE_CLIENT_SECRET: "client-secret",
  };
}

async function loadWorker(options?: {
  session?: Session;
  approved?: boolean;
  importResult?:
    | {
        ok: true;
        bookmark: Record<string, unknown>;
        duplicate: boolean;
      }
    | { ok: false; error: string };
}): Promise<{
  worker: ExportedHandler<Env>;
  authHandler: ReturnType<typeof vi.fn>;
  getSession: ReturnType<typeof vi.fn>;
  importBookmarkMock: ReturnType<typeof vi.fn> | null;
}> {
  vi.resetModules();

  const authHandler = vi.fn(async () => new Response("auth handler", { status: 418 }));
  const getSession = vi.fn(async () => options?.session ?? null);

  vi.doMock("../src/worker/auth", () => ({
    createAuth: () => ({
      api: { getSession },
      handler: authHandler,
    }),
    isApprovedEmail: () => options?.approved ?? true,
  }));

  let importBookmarkMock: ReturnType<typeof vi.fn> | null = null;
  if (options?.importResult !== undefined) {
    importBookmarkMock = vi.fn(async () => options.importResult);
    vi.doMock("../src/worker/import/import-bookmark", () => ({
      importBookmark: importBookmarkMock,
    }));
  }

  const workerModule = await import("../src/worker/index");

  return {
    worker: workerModule.default,
    authHandler,
    getSession,
    importBookmarkMock,
  };
}

async function fetchWorker(
  worker: ExportedHandler<Env>,
  path: string,
  init?: RequestInit,
): Promise<Response> {
  return worker.fetch(
    new Request(`https://cache.test${path}`, init),
    buildEnv(),
    createExecutionContext(),
  );
}

beforeEach(async () => {
  await seedUser(USER_ID, APPROVED_EMAIL);
});

afterEach(() => {
  vi.resetModules();
  vi.doUnmock("../src/worker/auth");
  vi.doUnmock("../src/worker/import/import-bookmark");
});

describe("bookmark HTTP routes", () => {
  it("requires an authenticated user", async () => {
    const { worker } = await loadWorker();

    const response = await fetchWorker(worker, "/api/bookmarks");

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Unauthorized" });
  });

  it("requires an approved user", async () => {
    const { worker } = await loadWorker({
      session: {
        user: {
          id: USER_ID,
          email: APPROVED_EMAIL,
        },
      },
      approved: false,
    });

    const response = await fetchWorker(worker, "/api/bookmarks");

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: "Forbidden" });
  });

  it("maps manual create validation failures to 400", async () => {
    const { worker } = await loadWorker({
      session: {
        user: {
          id: USER_ID,
          email: APPROVED_EMAIL,
        },
      },
    });

    const response = await fetchWorker(worker, "/api/bookmarks", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        title: "Valid title",
        url: "https://example.com",
        extra: true,
      }),
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Unknown field: extra",
    });
  });

  it("returns 201 for manual bookmark creation", async () => {
    const { worker } = await loadWorker({
      session: {
        user: {
          id: USER_ID,
          email: APPROVED_EMAIL,
        },
      },
    });

    const response = await fetchWorker(worker, "/api/bookmarks", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        title: "Created in route test",
        url: "https://example.com/created-in-route-test",
      }),
    });

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toMatchObject({
      user_id: USER_ID,
      title: "Created in route test",
      favorite: 0,
      archived: 0,
    });
  });

  it("maps missing bookmarks to 404", async () => {
    const { worker } = await loadWorker({
      session: {
        user: {
          id: USER_ID,
          email: APPROVED_EMAIL,
        },
      },
    });

    const response = await fetchWorker(worker, "/api/bookmarks/missing");

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      error: "Bookmark not found",
    });
  });

  it("returns 204 for a successful delete", async () => {
    await seedBookmark("delete-me", USER_ID);

    const { worker } = await loadWorker({
      session: {
        user: {
          id: USER_ID,
          email: APPROVED_EMAIL,
        },
      },
    });

    const response = await fetchWorker(worker, "/api/bookmarks/delete-me", {
      method: "DELETE",
    });

    expect(response.status).toBe(204);
    expect(
      await env.DB.prepare("SELECT id FROM bookmarks WHERE id = ?")
        .bind("delete-me")
        .first(),
    ).toBeNull();
  });

  it("returns 201 for a new import and 200 for a duplicate import", async () => {
    const session = {
      user: {
        id: USER_ID,
        email: APPROVED_EMAIL,
      },
    };
    const newBookmark = {
      id: "import-1",
      user_id: USER_ID,
      title: "Imported",
      url: "https://example.com/imported",
      description: null,
      image_url: null,
      favorite: 0,
      archived: 0,
      created_at: "2026-01-01 00:00:00",
      updated_at: "2026-01-01 00:00:00",
    };

    const first = await loadWorker({
      session,
      importResult: {
        ok: true,
        bookmark: newBookmark,
        duplicate: false,
      },
    });

    const createdResponse = await fetchWorker(first.worker, "/api/bookmarks/import", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({ url: "https://example.com/imported" }),
    });

    expect(createdResponse.status).toBe(201);
    expect(first.importBookmarkMock).toHaveBeenCalledWith(
      env.DB,
      USER_ID,
      "https://example.com/imported",
    );

    const second = await loadWorker({
      session,
      importResult: {
        ok: true,
        bookmark: newBookmark,
        duplicate: true,
      },
    });

    const duplicateResponse = await fetchWorker(
      second.worker,
      "/api/bookmarks/import",
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ url: "https://example.com/imported" }),
      },
    );

    expect(duplicateResponse.status).toBe(200);
  });

  it("keeps /api/auth/* routed through the Better Auth handler", async () => {
    const { worker, authHandler } = await loadWorker();

    const response = await fetchWorker(worker, "/api/auth/callback/google");

    expect(response.status).toBe(418);
    expect(authHandler).toHaveBeenCalledOnce();
    await expect(response.text()).resolves.toBe("auth handler");
  });
});

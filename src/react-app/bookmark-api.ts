import type { Bookmark, BookmarkDetail } from "./bookmark-types";

type BookmarkUpdate = Partial<
  Pick<
    Bookmark,
    "title" | "url" | "description" | "image_url" | "favorite" | "archived"
  >
>;

async function readError(response: Response): Promise<string> {
  const fallback = `Request failed with ${response.status}`;

  try {
    const body = (await response.json()) as unknown;
    if (
      typeof body === "object" &&
      body !== null &&
      "error" in body &&
      typeof body.error === "string"
    ) {
      return body.error;
    }
  } catch {
    const text = await response.text().catch(() => "");
    return text || fallback;
  }

  return fallback;
}

export async function fetchBookmarks(
  signal?: AbortSignal,
): Promise<Bookmark[]> {
  const response = await fetch("/api/bookmarks", {
    credentials: "include",
    signal,
  });

  if (!response.ok) {
    throw new Error(await readError(response));
  }

  return (await response.json()) as Bookmark[];
}

export async function fetchBookmark(
  bookmarkId: string,
  signal?: AbortSignal,
): Promise<BookmarkDetail> {
  const response = await fetch(
    `/api/bookmarks/${encodeURIComponent(bookmarkId)}`,
    {
      credentials: "include",
      signal,
    },
  );

  if (!response.ok) {
    throw new Error(await readError(response));
  }

  return (await response.json()) as BookmarkDetail;
}

export async function updateBookmark(
  bookmarkId: string,
  update: BookmarkUpdate,
): Promise<Bookmark> {
  const response = await fetch(`/api/bookmarks/${bookmarkId}`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(update),
  });

  if (!response.ok) {
    throw new Error(await readError(response));
  }

  return (await response.json()) as Bookmark;
}

export async function deleteBookmark(bookmarkId: string): Promise<void> {
  const response = await fetch(`/api/bookmarks/${bookmarkId}`, {
    method: "DELETE",
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error(await readError(response));
  }
}

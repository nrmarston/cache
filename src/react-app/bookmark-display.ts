type BookmarkDisplayInput = {
  title?: string;
  url: string;
  description: string | null;
};

export function formatBookmarkUrl(url: string): string {
  try {
    const hostname = new URL(url).hostname;
    return hostname.startsWith("www.") ? hostname.slice(4) : hostname;
  } catch {
    return url;
  }
}

export function getBookmarkSubtitle(bookmark: BookmarkDisplayInput): string {
  const description = bookmark.description?.trim();
  return description ? description : formatBookmarkUrl(bookmark.url);
}

export function getBookmarkFallbackLabel(
  bookmark: Pick<BookmarkDisplayInput, "title" | "url">,
): string {
  const source = bookmark.title?.trim() || formatBookmarkUrl(bookmark.url);
  return source.charAt(0).toUpperCase();
}

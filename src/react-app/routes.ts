export const APP_NAVIGATION_EVENT = "cache:navigation";

export function getBookmarkDetailPath(bookmarkId: string): string {
  return `/bookmarks/${encodeURIComponent(bookmarkId)}`;
}

export function getBookmarkDetailRoute(pathname: string): string | null {
  const match = /^\/bookmarks\/([^/]+)\/?$/.exec(pathname);
  if (!match?.[1]) return null;

  try {
    return decodeURIComponent(match[1]);
  } catch {
    return null;
  }
}

export function navigateToPath(pathname: string) {
  window.history.pushState(null, "", pathname);
  window.dispatchEvent(new Event(APP_NAVIGATION_EVENT));
}

export function navigateToBookmarks() {
  navigateToPath("/bookmarks");
}

export function navigateToBookmarkDetail(bookmarkId: string) {
  navigateToPath(getBookmarkDetailPath(bookmarkId));
}

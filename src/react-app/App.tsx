import { lazy, Suspense, useEffect, useState } from "react";
import { ThemeProvider } from "@/components/theme-provider";
import { APP_NAVIGATION_EVENT, getBookmarkDetailRoute } from "./routes";

const LandingPage = lazy(() =>
  import("@/components/landing-page").then((m) => ({ default: m.LandingPage })),
);
const BookmarksPage = lazy(() => import("./bookmarks-page"));
const BookmarkDetailPage = lazy(() => import("./bookmark-detail-page"));

function usePathname() {
  const [pathname, setPathname] = useState(() => window.location.pathname);

  useEffect(() => {
    const updatePathname = () => setPathname(window.location.pathname);

    window.addEventListener("popstate", updatePathname);
    window.addEventListener(APP_NAVIGATION_EVENT, updatePathname);

    return () => {
      window.removeEventListener("popstate", updatePathname);
      window.removeEventListener(APP_NAVIGATION_EVENT, updatePathname);
    };
  }, []);

  return pathname;
}

function App() {
  const pathname = usePathname();
  const bookmarkDetailId = getBookmarkDetailRoute(pathname);

  return (
    <ThemeProvider>
      <Suspense fallback={null}>
        {pathname === "/bookmarks" ? (
          <BookmarksPage />
        ) : bookmarkDetailId ? (
          <BookmarkDetailPage
            key={bookmarkDetailId}
            bookmarkId={bookmarkDetailId}
          />
        ) : (
          <LandingPage />
        )}
      </Suspense>
    </ThemeProvider>
  );
}

export default App;

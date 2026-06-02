import { useCallback, useEffect, useMemo, useState } from "react";
import { BoxArrowUpIcon, PlusIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { BookmarkList } from "@/components/bookmark-list";
import { ImportBookmarkCommand } from "@/components/import-bookmark-command";
import { deleteBookmark, fetchBookmarks, updateBookmark } from "./bookmark-api";
import { authClient } from "./auth-client";
import type { Bookmark, BookmarkFilter } from "./bookmark-types";

type BookmarksState =
  | { status: "idle" | "loading" }
  | { status: "loaded"; bookmarks: Bookmark[] }
  | { status: "error"; message: string };

type BookmarkAction = "favorite" | "archive" | "delete";

type PendingAction = {
  bookmarkId: string;
  action: BookmarkAction;
} | null;

const FILTER_TITLES: Record<BookmarkFilter, string> = {
  all: "Bookmarks",
  favorites: "Favorites",
  archived: "Archived",
};

const EMPTY_BOOKMARKS: Bookmark[] = [];

function HomePage() {
  return (
    <section className="grid min-h-screen w-full place-items-center bg-primary/80 py-20 text-white">
      <div className="container">
        <div className="flex flex-col items-center space-y-3">
          <BoxArrowUpIcon weight="duotone" size={48} />
          <h1 className="text-6xl">Coming soon.</h1>
          <p className="text-xl">Stay tuned to find out when we launch.</p>
          <Button variant="secondary">Click me</Button>
        </div>
      </div>
    </section>
  );
}

function BookmarksPage() {
  const session = authClient.useSession();
  const [bookmarksState, setBookmarksState] = useState<BookmarksState>({
    status: "idle",
  });
  const [importOpen, setImportOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<BookmarkFilter>("all");
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [mutationError, setMutationError] = useState<string | null>(null);

  const loadBookmarks = useCallback(async (signal?: AbortSignal) => {
    setBookmarksState({ status: "loading" });
    setMutationError(null);

    try {
      const bookmarks = await fetchBookmarks(signal);
      setBookmarksState({ status: "loaded", bookmarks });
    } catch (error: unknown) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }

      setBookmarksState({
        status: "error",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }, []);

  const replaceBookmark = useCallback((bookmark: Bookmark) => {
    setBookmarksState((state) => {
      if (state.status !== "loaded") return state;

      return {
        status: "loaded",
        bookmarks: state.bookmarks.map((item) =>
          item.id === bookmark.id ? bookmark : item,
        ),
      };
    });
  }, []);

  const removeBookmark = useCallback((bookmarkId: string) => {
    setBookmarksState((state) => {
      if (state.status !== "loaded") return state;

      return {
        status: "loaded",
        bookmarks: state.bookmarks.filter((item) => item.id !== bookmarkId),
      };
    });
  }, []);

  const runBookmarkAction = useCallback(
    async (
      bookmark: Bookmark,
      action: BookmarkAction,
      request: () => Promise<Bookmark | void>,
    ) => {
      if (pendingAction) return;

      setPendingAction({ bookmarkId: bookmark.id, action });
      setMutationError(null);

      try {
        const result = await request();
        if (result) {
          replaceBookmark(result);
        } else {
          removeBookmark(bookmark.id);
        }
      } catch (error) {
        setMutationError(
          error instanceof Error ? error.message : "Bookmark action failed",
        );
      } finally {
        setPendingAction(null);
      }
    },
    [pendingAction, removeBookmark, replaceBookmark],
  );

  const allBookmarks =
    bookmarksState.status === "loaded"
      ? bookmarksState.bookmarks
      : EMPTY_BOOKMARKS;

  const visibleBookmarks = useMemo(() => {
    if (activeFilter === "favorites") {
      return allBookmarks.filter(
        (bookmark) => bookmark.favorite === 1 && bookmark.archived === 0,
      );
    }

    if (activeFilter === "archived") {
      return allBookmarks.filter((bookmark) => bookmark.archived === 1);
    }

    return allBookmarks.filter((bookmark) => bookmark.archived === 0);
  }, [activeFilter, allBookmarks]);

  useEffect(() => {
    if (!session.data) return;

    const controller = new AbortController();
    void loadBookmarks(controller.signal);

    return () => controller.abort();
  }, [session.data, loadBookmarks]);

  if (session.isPending) {
    return <main className="p-6">Loading session…</main>;
  }

  if (session.error) {
    return <main className="p-6">Session error: {session.error.message}</main>;
  }

  if (!session.data) {
    return (
      <main className="space-y-4 p-6">
        <h1 className="text-2xl font-semibold">Bookmarks API test</h1>
        <p>Sign in to fetch your bookmarks JSON.</p>
        <Button
          onClick={() => {
            void authClient.signIn.social({
              provider: "google",
              callbackURL: "/bookmarks",
            });
          }}
        >
          Sign in with Google
        </Button>
      </main>
    );
  }

  return (
    <SidebarProvider>
      <AppSidebar
        userEmail={session.data.user.email}
        activeFilter={activeFilter}
        onFilterChange={setActiveFilter}
      />
      <SidebarInset className="flex h-svh flex-col overflow-hidden">
        <header className="flex shrink-0 items-center gap-3 border-b px-4 py-3">
          <SidebarTrigger className="md:hidden" />
          <div className="min-w-0">
            <h1 className="text-xl font-semibold tracking-normal">
              {FILTER_TITLES[activeFilter]}
            </h1>
            {bookmarksState.status === "loaded" ? (
              <p className="text-sm text-muted-foreground">
                {visibleBookmarks.length} shown - {allBookmarks.length} total
              </p>
            ) : null}
          </div>
          <Button
            variant="outline"
            size="icon-sm"
            className="ml-auto"
            aria-label="Add bookmark"
            onClick={() => setImportOpen(true)}
          >
            <PlusIcon />
          </Button>
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6">
            {bookmarksState.status === "idle" ||
            bookmarksState.status === "loading" ? (
              <p className="text-sm text-muted-foreground">
                Loading Bookmarks...
              </p>
            ) : null}

            {bookmarksState.status === "error" ? (
              <pre className="overflow-auto rounded-md bg-destructive/10 p-4 text-sm text-destructive">
                {bookmarksState.message}
              </pre>
            ) : null}

            {bookmarksState.status === "loaded" ? (
              <>
                {mutationError ? (
                  <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                    {mutationError}
                  </p>
                ) : null}

                <BookmarkList
                  bookmarks={visibleBookmarks}
                  filter={activeFilter}
                  pendingAction={pendingAction}
                  onToggleFavorite={(bookmark) =>
                    void runBookmarkAction(bookmark, "favorite", () =>
                      updateBookmark(bookmark.id, {
                        favorite: bookmark.favorite ? 0 : 1,
                      }),
                    )
                  }
                  onToggleArchived={(bookmark) =>
                    void runBookmarkAction(bookmark, "archive", () =>
                      updateBookmark(bookmark.id, {
                        archived: bookmark.archived ? 0 : 1,
                      }),
                    )
                  }
                  onDelete={(bookmark) =>
                    void runBookmarkAction(bookmark, "delete", () =>
                      deleteBookmark(bookmark.id),
                    )
                  }
                />

                <details open className="rounded-md border bg-muted/40">
                  <summary className="cursor-pointer px-4 py-3 text-sm font-medium">
                    JSON
                  </summary>
                  <pre className="max-h-96 overflow-auto border-t p-4 text-xs leading-relaxed">
                    {JSON.stringify(allBookmarks, null, 2)}
                  </pre>
                </details>
              </>
            ) : null}
          </div>
        </main>
      </SidebarInset>

      <ImportBookmarkCommand
        open={importOpen}
        onOpenChange={setImportOpen}
        onImported={() => void loadBookmarks()}
      />
    </SidebarProvider>
  );
}

function App() {
  if (window.location.pathname === "/bookmarks") {
    return <BookmarksPage />;
  }

  return <HomePage />;
}

export default App;

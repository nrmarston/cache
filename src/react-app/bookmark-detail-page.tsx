import { useEffect, useState } from "react";
import { ArrowLeftIcon, ArrowSquareOutIcon } from "@phosphor-icons/react";
import { ModeToggle } from "@/components/mode-toggle";
import { Button } from "@/components/ui/button";
import { fetchBookmark } from "./bookmark-api";
import { authClient } from "./auth-client";
import type { BookmarkDetail } from "./bookmark-types";
import { navigateToBookmarks } from "./routes";
import { pageTitle, useDocumentTitle } from "@/hooks/use-document-title";

type BookmarkDetailState =
  | { status: "idle" | "loading" }
  | { status: "loaded"; bookmark: BookmarkDetail }
  | { status: "error"; message: string };

function openBookmark(url: string) {
  window.open(url, "_blank", "noopener,noreferrer");
}

export default function BookmarkDetailPage({
  bookmarkId,
}: {
  bookmarkId: string;
}) {
  const session = authClient.useSession();
  const sessionUserId = session.data?.user.id;
  const [bookmarkState, setBookmarkState] = useState<BookmarkDetailState>({
    status: "loading",
  });

  useDocumentTitle(
    pageTitle(
      bookmarkState.status === "loaded" ? bookmarkState.bookmark.title : "Bookmark",
    ),
  );

  useEffect(() => {
    if (!sessionUserId) return;

    const controller = new AbortController();
    void fetchBookmark(bookmarkId, controller.signal)
      .then((bookmark) => setBookmarkState({ status: "loaded", bookmark }))
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }

        setBookmarkState({
          status: "error",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      });

    return () => controller.abort();
  }, [bookmarkId, sessionUserId]);

  if (session.isPending) {
    return <main className="p-6">Loading session...</main>;
  }

  if (session.error) {
    return <main className="p-6">Session error: {session.error.message}</main>;
  }

  if (!session.data) {
    return (
      <main className="space-y-4 p-6">
        <h1 className="text-2xl font-semibold">Bookmark</h1>
        <p>Sign in to open this Bookmark.</p>
        <div className="flex items-center gap-1">
          <Button
            onClick={() => {
              void authClient.signIn.social({
                provider: "google",
                callbackURL: window.location.pathname,
              });
            }}
          >
            Sign in with Google
          </Button>
          <ModeToggle />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b bg-background/95 px-4 py-3 backdrop-blur sm:px-6">
        <div className="mx-auto flex max-w-3xl items-center gap-2">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Back to Bookmarks"
            onClick={navigateToBookmarks}
          >
            <ArrowLeftIcon />
          </Button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm text-muted-foreground">Bookmark</p>
          </div>
          {bookmarkState.status === "loaded" ? (
            <Button
              variant="outline"
              size="icon-sm"
              aria-label="Open Bookmark"
              onClick={() => openBookmark(bookmarkState.bookmark.url)}
            >
              <ArrowSquareOutIcon />
            </Button>
          ) : null}
        </div>
      </header>

      <section className="mx-auto flex max-w-3xl flex-col gap-5 px-4 py-8 sm:px-6">
        {bookmarkState.status === "idle" ||
        bookmarkState.status === "loading" ? (
          <p className="text-sm text-muted-foreground">Loading Bookmark...</p>
        ) : null}

        {bookmarkState.status === "error" ? (
          <pre className="overflow-auto rounded-md bg-destructive/10 p-4 text-sm text-destructive">
            {bookmarkState.message}
          </pre>
        ) : null}

        {bookmarkState.status === "loaded" ? (
          <>
            <div className="space-y-2">
              <h1 className="text-3xl leading-tight font-semibold tracking-normal">
                {bookmarkState.bookmark.title}
              </h1>
              <a
                className="block truncate text-sm text-muted-foreground underline-offset-4 hover:underline"
                href={bookmarkState.bookmark.url}
                target="_blank"
                rel="noreferrer"
              >
                {bookmarkState.bookmark.url}
              </a>
            </div>

            {bookmarkState.bookmark.readable_content?.trim() ? (
              <article className="text-base leading-8 whitespace-pre-wrap">
                {bookmarkState.bookmark.readable_content}
              </article>
            ) : (
              <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                No Readable Content saved for this Bookmark.
              </p>
            )}
          </>
        ) : null}
      </section>
    </main>
  );
}

import { useCallback, useEffect, useState } from "react";
import { BoxArrowUpIcon, PlusIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ImportBookmarkCommand } from "@/components/import-bookmark-command";
import { authClient } from "./auth-client";

type Bookmark = {
  id: string;
  user_id: string;
  title: string;
  url: string;
  description: string | null;
  image_url: string | null;
  favorite: number;
  archived: number;
  created_at: string;
  updated_at: string;
};

type BookmarksState =
  | { status: "idle" | "loading" }
  | { status: "loaded"; bookmarks: Bookmark[] }
  | { status: "error"; message: string };

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

  const loadBookmarks = useCallback(async (signal?: AbortSignal) => {
    setBookmarksState({ status: "loading" });

    try {
      const response = await fetch("/api/bookmarks", {
        credentials: "include",
        signal,
      });

      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || `Request failed with ${response.status}`);
      }

      const bookmarks = (await response.json()) as Bookmark[];
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
      <AppSidebar userEmail={session.data.user.email} />
      <SidebarInset className="flex h-svh flex-col overflow-hidden">
        <header className="flex shrink-0 items-center gap-2 border-b p-4">
          <SidebarTrigger className="md:hidden" />
          <h1 className="text-2xl font-semibold">Bookmarks</h1>
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

        <main className="flex-1 space-y-4 overflow-y-auto p-6">
          {bookmarksState.status === "idle" ||
          bookmarksState.status === "loading" ? (
            <p>Loading bookmarks…</p>
          ) : null}

          {bookmarksState.status === "error" ? (
            <pre className="overflow-auto rounded-md bg-destructive/10 p-4 text-sm text-destructive">
              {bookmarksState.message}
            </pre>
          ) : null}

          {bookmarksState.status === "loaded" ? (
            <pre className="overflow-auto rounded-md bg-muted p-4 text-sm">
              {JSON.stringify(bookmarksState.bookmarks, null, 2)}
            </pre>
          ) : null}
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

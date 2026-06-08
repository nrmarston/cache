import {
  ArchiveIcon,
  ArrowRightIcon,
  ArticleIcon,
  BookmarkSimpleIcon,
  CheckIcon,
  GoogleLogoIcon,
  LightningIcon,
  MagnifyingGlassIcon,
  PlusIcon,
} from "@phosphor-icons/react";

import { Logo } from "@/components/logo";
import { ModeToggle } from "@/components/mode-toggle";
import { Button } from "@/components/ui/button";
import { authClient } from "@/react-app/auth-client";
import { useDocumentTitle } from "@/hooks/use-document-title";

const BENEFITS = [
  {
    icon: BookmarkSimpleIcon,
    title: "Save anything",
    body: "Drop in any link. Cache grabs the title, image, and content so the page is yours even if the original disappears.",
  },
  {
    icon: ArticleIcon,
    title: "Read it later, cleanly",
    body: "Long-form articles are stored as readable text — no ads, no clutter, no chasing a dead URL.",
  },
  {
    icon: ArchiveIcon,
    title: "Archive, never lose",
    body: "Done with a link but not ready to let go? Archive it. Deleting is always a deliberate choice.",
  },
  {
    icon: MagnifyingGlassIcon,
    title: "Find it fast",
    body: "A command palette puts every bookmark a keystroke away. Stop re-googling things you already found.",
  },
] as const;

const STEPS = [
  {
    title: "Save a link",
    body: "Paste a URL into Cache from anywhere you browse.",
  },
  {
    title: "Cache does the work",
    body: "We fetch a readable copy, the cover image, and a clean title in the background.",
  },
  {
    title: "Come back anytime",
    body: "Search, read, favorite, or archive — your library stays calm and organized.",
  },
] as const;

const FAQS = [
  {
    q: "Who is Cache for?",
    a: "Anyone who saves more links than they can keep track of. Cache is a personal, single-user library — not a feed or a social network.",
  },
  {
    q: "Is it invite-only?",
    a: "For now, yes. Access is gated to approved Google accounts while Cache is early. Sign in to check if you're on the list.",
  },
  {
    q: "What happens to a link after I save it?",
    a: "Cache stores a readable copy of the page and its cover image, so the content survives even if the original site goes down.",
  },
  {
    q: "Can I delete things?",
    a: "Always. Archive keeps things out of sight; delete removes them for good. The choice is yours and it's never automatic.",
  },
] as const;

function signIn() {
  void authClient.signIn.social({
    provider: "google",
    callbackURL: "/bookmarks",
  });
}

function SignInButton({
  size = "default",
  full = false,
}: {
  size?: "default" | "lg";
  full?: boolean;
}) {
  return (
    <Button
      size={size}
      onClick={signIn}
      className={full ? "w-full sm:w-auto" : undefined}
    >
      <GoogleLogoIcon weight="bold" />
      Sign in with Google
    </Button>
  );
}

export function LandingPage() {
  useDocumentTitle("Cache — A calmer home for everything you save");

  return (
    <div className="min-h-dvh bg-background text-foreground">
      {/* Sticky nav — logo + single CTA */}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur">
        <nav className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4 sm:px-6">
          <a
            href="/"
            className="flex items-center gap-2 font-semibold tracking-tight"
          >
            <Logo className="size-7" />
            Cache
          </a>
          <div className="flex items-center gap-1.5">
            <ModeToggle />
            <SignInButton size="default" />
          </div>
        </nav>
      </header>

      <main>
        {/* Hero */}
        <section className="mx-auto max-w-5xl px-4 pt-16 pb-12 text-center sm:px-6 sm:pt-24 sm:pb-16">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/50 px-3 py-1 text-xs font-medium text-muted-foreground">
            <LightningIcon weight="fill" className="size-3.5 text-primary" />
            A calmer home for everything you save
          </span>
          <h1 className="mx-auto mt-6 max-w-3xl text-4xl leading-[1.05] font-semibold tracking-tight text-balance sm:text-6xl">
            Every link you save, in one calm place.
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-base text-pretty text-muted-foreground sm:text-lg">
            Cache keeps your bookmarks readable, searchable, and out of the way —
            so the things worth remembering are always one keystroke away.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <SignInButton size="lg" full />
            <a
              href="#how-it-works"
              className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
            >
              See how it works
              <ArrowRightIcon className="size-4" />
            </a>
          </div>

          {/* Product preview mock */}
          <div className="mx-auto mt-14 max-w-3xl text-left">
            <div className="rounded-xl border border-border bg-card shadow-sm">
              <div className="flex items-center gap-1.5 border-b border-border px-4 py-3">
                <span className="size-2.5 rounded-full bg-muted-foreground/25" />
                <span className="size-2.5 rounded-full bg-muted-foreground/25" />
                <span className="size-2.5 rounded-full bg-muted-foreground/25" />
                <div className="ml-3 flex h-7 flex-1 items-center gap-2 rounded-md bg-muted px-2.5 text-xs text-muted-foreground">
                  <MagnifyingGlassIcon className="size-3.5" />
                  Search your library…
                </div>
              </div>
              <ul className="divide-y divide-border">
                {[
                  "The Anatomy of a High-Converting Landing Page",
                  "How I Organize 2,000 Bookmarks Without Losing My Mind",
                  "A Field Guide to Reading on the Web",
                ].map((title, i) => (
                  <li
                    key={title}
                    className="flex items-center gap-3 px-4 py-3.5"
                  >
                    <span className="grid size-9 shrink-0 place-items-center rounded-md bg-muted text-muted-foreground">
                      <ArticleIcon className="size-4" />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{title}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {["supafast.com", "blog.example.com", "wired.com"][i]}
                      </p>
                    </div>
                    <BookmarkSimpleIcon
                      weight={i === 0 ? "fill" : "regular"}
                      className="ml-auto size-4 text-muted-foreground"
                    />
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* Principles row (honest social proof, not fake logos) */}
        <section className="border-y border-border/60 bg-muted/30">
          <div className="mx-auto grid max-w-5xl grid-cols-1 divide-y divide-border/60 px-4 sm:grid-cols-3 sm:divide-x sm:divide-y-0 sm:px-6">
            {[
              ["Yours alone", "Private by default — a single-user library, never a feed."],
              ["Content that lasts", "Pages saved as readable text survive dead links."],
              ["No busywork", "No folders to maintain. Save, search, done."],
            ].map(([title, body]) => (
              <div key={title} className="px-2 py-6 sm:px-6">
                <p className="text-sm font-semibold">{title}</p>
                <p className="mt-1 text-sm text-muted-foreground">{body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Benefits */}
        <section className="mx-auto max-w-5xl px-4 py-16 sm:px-6 sm:py-24">
          <div className="max-w-2xl">
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Built to get out of your way
            </h2>
            <p className="mt-3 text-muted-foreground">
              Features tell, but benefits sell. Here's what Cache actually does
              for you.
            </p>
          </div>
          <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {BENEFITS.map(({ icon: Icon, title, body }) => (
              <div
                key={title}
                className="rounded-xl border border-border bg-card p-5 transition-colors hover:border-primary/40"
              >
                <span className="grid size-10 place-items-center rounded-lg bg-primary/10 text-primary">
                  <Icon weight="duotone" className="size-5" />
                </span>
                <h3 className="mt-4 font-medium">{title}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section
          id="how-it-works"
          className="border-t border-border/60 bg-muted/30"
        >
          <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 sm:py-24">
            <div className="max-w-2xl">
              <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                How it works
              </h2>
              <p className="mt-3 text-muted-foreground">
                Three steps, then never think about it again.
              </p>
            </div>
            <ol className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-3">
              {STEPS.map(({ title, body }, i) => (
                <li key={title} className="relative">
                  <span className="grid size-8 place-items-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                    {i + 1}
                  </span>
                  <h3 className="mt-4 font-medium">{title}</h3>
                  <p className="mt-1.5 text-sm text-muted-foreground">{body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* FAQ */}
        <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-24">
          <h2 className="text-center text-2xl font-semibold tracking-tight sm:text-3xl">
            Questions, answered
          </h2>
          <dl className="mt-10 divide-y divide-border border-y border-border">
            {FAQS.map(({ q, a }) => (
              <div key={q} className="py-5">
                <dt className="flex items-start gap-2 font-medium">
                  <CheckIcon className="mt-0.5 size-4 shrink-0 text-primary" />
                  {q}
                </dt>
                <dd className="mt-2 pl-6 text-sm text-muted-foreground">{a}</dd>
              </div>
            ))}
          </dl>
        </section>

        {/* Final CTA */}
        <section className="mx-auto max-w-5xl px-4 pb-20 sm:px-6">
          <div className="rounded-2xl border border-border bg-primary px-6 py-12 text-center text-primary-foreground sm:py-16">
            <h2 className="mx-auto max-w-xl text-2xl font-semibold tracking-tight text-balance sm:text-4xl">
              Start saving links you'll actually find again.
            </h2>
            <p className="mx-auto mt-3 max-w-md text-primary-foreground/80">
              Sign in with Google to open your library.
            </p>
            <div className="mt-7 flex justify-center">
              <Button
                size="lg"
                variant="secondary"
                onClick={signIn}
                className="bg-background text-foreground hover:bg-background/90"
              >
                <GoogleLogoIcon weight="bold" />
                Sign in with Google
              </Button>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/60">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 px-4 py-8 sm:flex-row sm:px-6">
          <a href="/" className="flex items-center gap-2 text-sm font-semibold">
            <Logo className="size-6" />
            Cache
          </a>
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} Cache. A personal bookmark manager.
          </p>
          <button
            type="button"
            onClick={signIn}
            className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <PlusIcon className="size-3.5" />
            Sign in
          </button>
        </div>
      </footer>
    </div>
  );
}

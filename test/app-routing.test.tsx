import { renderToStaticMarkup } from "react-dom/server";
import * as React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const sessionState = vi.hoisted(() => ({
  data: {
    user: {
      email: "user@example.com",
      id: "user-1",
    },
  },
  error: null,
  isPending: false,
}));

vi.mock("@/react-app/auth-client", () => ({
  authClient: {
    signIn: {
      social: vi.fn(),
    },
    signOut: vi.fn(),
    useSession: () => sessionState,
  },
}));

vi.mock("@/components/bookmark-list", () => ({
  BookmarkList: () => null,
}));

vi.mock("@/components/import-bookmark-command", () => ({
  ImportBookmarkCommand: () => null,
}));

vi.mock("@/components/mode-toggle", () => ({
  ModeToggle: () => null,
}));

vi.mock("@/components/app-sidebar", () => ({
  AppSidebar: () => null,
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button type="button" {...props}>
      {children}
    </button>
  ),
}));

vi.mock("@/components/ui/sidebar", () => ({
  SidebarInset: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  SidebarProvider: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  SidebarTrigger: () => <button type="button">Toggle sidebar</button>,
}));

vi.mock("@/react-app/bookmark-api", () => ({
  deleteBookmark: vi.fn(),
  fetchBookmark: vi.fn(),
  fetchBookmarks: vi.fn(() => Promise.resolve([])),
  updateBookmark: vi.fn(),
}));

import App from "@/react-app/App";

describe("App routing", () => {
  beforeEach(() => {
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: {
        getItem: vi.fn(() => null),
        setItem: vi.fn(),
      },
    });
  });

  it("renders bookmark detail route for /bookmarks/:id", () => {
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: {
        location: {
          pathname: "/bookmarks/bookmark-1",
        },
      },
    });

    const html = renderToStaticMarkup(<App />);

    expect(html).toContain("Loading Bookmark...");
    expect(html).not.toContain("Coming soon.");
  });
});

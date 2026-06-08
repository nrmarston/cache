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

vi.mock("@/components/mode-toggle", async () => {
  const React = await import("react");
  const { useTheme } = await import("@/components/theme-provider");

  return {
    ModeToggle: () => {
      const { setTheme } = useTheme();
      setTheme("dark");

      return React.createElement("button", null, "Theme toggle");
    },
  };
});

vi.mock("@/components/app-sidebar", async () => {
  const { ModeToggle } = await import("@/components/mode-toggle");

  return {
    AppSidebar: () => <ModeToggle />,
  };
});

vi.mock("@/react-app/bookmark-api", () => ({
  deleteBookmark: vi.fn(),
  fetchBookmarks: vi.fn(() => Promise.resolve([])),
  updateBookmark: vi.fn(),
}));

import App from "@/react-app/App";

describe("App theme provider", () => {
  beforeEach(() => {
    const storage = new Map<string, string>();

    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: {
        getItem: vi.fn((key: string) => storage.get(key) ?? null),
        setItem: vi.fn((key: string, value: string) => {
          storage.set(key, value);
        }),
      },
    });

    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: {
        location: {
          pathname: "/bookmarks",
        },
      },
    });
  });

  it("wraps the bookmarks route in the theme provider", () => {
    renderToStaticMarkup(<App />);

    expect(localStorage.getItem("vite-ui-theme")).toBe("dark");
  });
});

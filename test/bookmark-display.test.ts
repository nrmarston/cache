import { describe, expect, it } from "vitest";

describe("bookmark display helpers", () => {
  it("formats a Bookmark URL as a hostname without common noise", async () => {
    const { formatBookmarkUrl } =
      await import("../src/react-app/bookmark-display");

    expect(
      formatBookmarkUrl("https://www.example.com/articles/read?utm_source=x"),
    ).toBe("example.com");
  });

  it("uses description when present and falls back to the hostname", async () => {
    const { getBookmarkSubtitle } =
      await import("../src/react-app/bookmark-display");

    expect(
      getBookmarkSubtitle({
        description: "A useful article",
        url: "https://example.com/article",
      }),
    ).toBe("A useful article");

    expect(
      getBookmarkSubtitle({
        description: null,
        url: "https://docs.example.com/guide",
      }),
    ).toBe("docs.example.com");
  });

  it("derives a stable fallback label from title or URL", async () => {
    const { getBookmarkFallbackLabel } =
      await import("../src/react-app/bookmark-display");

    expect(
      getBookmarkFallbackLabel({
        title: "  OpenAI Developers  ",
        url: "https://developers.openai.com",
      }),
    ).toBe("O");

    expect(
      getBookmarkFallbackLabel({
        title: "   ",
        url: "https://cache.example.com/bookmarks",
      }),
    ).toBe("C");
  });
});

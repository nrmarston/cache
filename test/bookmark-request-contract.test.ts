import { describe, expect, it } from "vitest";

describe("validateCreateBookmarkRequest", () => {
  it("rejects an unknown field", async () => {
    const { validateCreateBookmarkRequest } = await import(
      "../src/worker/bookmarks/request-contract"
    );

    expect(
      validateCreateBookmarkRequest({
        title: "Example",
        url: "https://example.com",
        extra: true,
      }),
    ).toEqual({
      ok: false,
      error: "Unknown field: extra",
    });
  });

  it("rejects a malformed body", async () => {
    const { validateCreateBookmarkRequest } = await import(
      "../src/worker/bookmarks/request-contract"
    );

    expect(validateCreateBookmarkRequest(null)).toEqual({
      ok: false,
      error: "Request body must be an object",
    });
  });

  it("requires a non-empty title", async () => {
    const { validateCreateBookmarkRequest } = await import(
      "../src/worker/bookmarks/request-contract"
    );

    expect(
      validateCreateBookmarkRequest({
        title: "   ",
        url: "https://example.com",
      }),
    ).toEqual({
      ok: false,
      error: "title must be a non-empty string",
    });
  });

  it("requires a valid url", async () => {
    const { validateCreateBookmarkRequest } = await import(
      "../src/worker/bookmarks/request-contract"
    );

    expect(
      validateCreateBookmarkRequest({
        title: "Example",
        url: "not-a-url",
      }),
    ).toEqual({
      ok: false,
      error: "url must be a valid URL",
    });
  });

  it("coerces flags and nullable text fields for a valid request", async () => {
    const { validateCreateBookmarkRequest } = await import(
      "../src/worker/bookmarks/request-contract"
    );

    expect(
      validateCreateBookmarkRequest({
        title: "  Example Title  ",
        url: "https://example.com/article",
        description: null,
        image_url: "https://example.com/image.png",
        favorite: true,
        archived: 1,
      }),
    ).toEqual({
      ok: true,
      value: {
        title: "Example Title",
        url: "https://example.com/article",
        description: null,
        image_url: "https://example.com/image.png",
        favorite: 1,
        archived: 1,
      },
    });
  });
});

describe("validateUpdateBookmarkRequest", () => {
  it("rejects an empty body", async () => {
    const { validateUpdateBookmarkRequest } = await import(
      "../src/worker/bookmarks/request-contract"
    );

    expect(validateUpdateBookmarkRequest({})).toEqual({
      ok: false,
      error: "At least one field is required",
    });
  });

  it("rejects unknown fields", async () => {
    const { validateUpdateBookmarkRequest } = await import(
      "../src/worker/bookmarks/request-contract"
    );

    expect(
      validateUpdateBookmarkRequest({
        title: "Updated",
        extra: true,
      }),
    ).toEqual({
      ok: false,
      error: "Unknown field: extra",
    });
  });

  it("rejects invalid partial values", async () => {
    const { validateUpdateBookmarkRequest } = await import(
      "../src/worker/bookmarks/request-contract"
    );

    expect(
      validateUpdateBookmarkRequest({
        favorite: "yes",
      }),
    ).toEqual({
      ok: false,
      error: "favorite must be a boolean or 0/1",
    });
  });

  it("accepts a partial update", async () => {
    const { validateUpdateBookmarkRequest } = await import(
      "../src/worker/bookmarks/request-contract"
    );

    expect(
      validateUpdateBookmarkRequest({
        title: "  Updated title  ",
        archived: true,
      }),
    ).toEqual({
      ok: true,
      value: {
        title: "Updated title",
        archived: 1,
      },
    });
  });
});

describe("validateImportBookmarkRequest", () => {
  it("rejects unknown fields", async () => {
    const { validateImportBookmarkRequest } = await import(
      "../src/worker/bookmarks/request-contract"
    );

    expect(
      validateImportBookmarkRequest({
        url: "https://example.com",
        title: "Nope",
      }),
    ).toEqual({
      ok: false,
      error: "Unknown field: title",
    });
  });

  it("accepts only the url field", async () => {
    const { validateImportBookmarkRequest } = await import(
      "../src/worker/bookmarks/request-contract"
    );

    expect(
      validateImportBookmarkRequest({
        url: "https://example.com/article",
      }),
    ).toEqual({
      ok: true,
      value: {
        url: "https://example.com/article",
      },
    });
  });
});

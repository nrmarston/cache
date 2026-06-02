import { describe, expect, it } from "vitest";
import { extractMetadata } from "../src/worker/import/extract-metadata";

describe("extractMetadata", () => {
  it("extracts the <title>", async () => {
    const meta = await extractMetadata(
      "<html><head><title>Hello World</title></head><body></body></html>",
    );
    expect(meta.title).toBe("Hello World");
  });

  it("falls back to og:title when <title> is absent", async () => {
    const meta = await extractMetadata(
      '<html><head><meta property="og:title" content="OG Title"></head></html>',
    );
    expect(meta.title).toBe("OG Title");
  });

  it("prefers <title> over og:title", async () => {
    const meta = await extractMetadata(
      '<head><title>Real Title</title><meta property="og:title" content="OG Title"></head>',
    );
    expect(meta.title).toBe("Real Title");
  });

  it("extracts the meta description and falls back to og:description", async () => {
    const withName = await extractMetadata(
      '<head><meta name="description" content="A description"></head>',
    );
    expect(withName.description).toBe("A description");

    const withOg = await extractMetadata(
      '<head><meta property="og:description" content="OG description"></head>',
    );
    expect(withOg.description).toBe("OG description");
  });

  it("prefers the meta description over og:description", async () => {
    const meta = await extractMetadata(
      '<head><meta name="description" content="Plain"><meta property="og:description" content="OG"></head>',
    );
    expect(meta.description).toBe("Plain");
  });

  it("extracts og:image", async () => {
    const meta = await extractMetadata(
      '<head><meta property="og:image" content="https://example.com/img.png"></head>',
    );
    expect(meta.image).toBe("https://example.com/img.png");
  });

  it("returns undefined for fields that are absent", async () => {
    const meta = await extractMetadata(
      "<html><head></head><body>No metadata here</body></html>",
    );
    expect(meta.title).toBeUndefined();
    expect(meta.description).toBeUndefined();
    expect(meta.image).toBeUndefined();
  });

  it("caps overly long titles to a sane length", async () => {
    const long = "x".repeat(500);
    const meta = await extractMetadata(`<head><title>${long}</title></head>`);
    expect(meta.title).toBeDefined();
    expect((meta.title ?? "").length).toBeLessThanOrEqual(200);
  });
});

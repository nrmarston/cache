import { describe, expect, it } from "vitest";
import {
  extractReadableContent,
  MAX_READABLE_CONTENT_LENGTH,
} from "../src/worker/import/extract-readable-content";

describe("extractReadableContent", () => {
  it("extracts main readable article text without page chrome", () => {
    const result = extractReadableContent(`
      <html>
        <head>
          <title>Ignored title</title>
          <script>window.noise = true</script>
          <style>.ad { display: none }</style>
        </head>
        <body>
          <nav>Navigation links and menus</nav>
          <main>
            <article>
              <h1>Readable Content Title</h1>
              <p>This is the first useful paragraph.</p>
              <p>This is the second useful paragraph.</p>
            </article>
          </main>
          <footer>Footer boilerplate</footer>
        </body>
      </html>
    `);

    expect(result).not.toBeNull();
    expect(result?.content).toContain("Readable Content Title");
    expect(result?.content).toContain("This is the first useful paragraph.");
    expect(result?.content).toContain("This is the second useful paragraph.");
    expect(result?.content).not.toContain("Navigation links and menus");
    expect(result?.content).not.toContain("window.noise");
    expect(result?.content).not.toContain("Footer boilerplate");
    expect(result?.length).toBe(result?.content.length);
  });

  it("returns null when no readable content is found", () => {
    expect(extractReadableContent("<html><body></body></html>")).toBeNull();
  });

  it("normalizes whitespace and caps stored content", () => {
    const longText = "useful text ".repeat(20_000);
    const result = extractReadableContent(`
      <html>
        <body>
          <article>
            <p>  ${longText}
            </p>
          </article>
        </body>
      </html>
    `);

    expect(result).not.toBeNull();
    expect(result?.content).not.toContain("\n");
    expect(result?.content.length).toBe(MAX_READABLE_CONTENT_LENGTH);
    expect(result?.length).toBe(MAX_READABLE_CONTENT_LENGTH);
  });
});

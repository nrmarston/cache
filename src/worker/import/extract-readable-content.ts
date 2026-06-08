import { Readability } from "@mozilla/readability";
import { parseHTML } from "linkedom/worker";

export type ReadableContent = {
  content: string;
  length: number;
};

export const MAX_READABLE_CONTENT_LENGTH = 100_000;

export function extractReadableContent(html: string): ReadableContent | null {
  try {
    const { document } = parseHTML(html);
    removePageChrome(document);
    const article = new Readability(document).parse();
    const content = normalizeReadableContent(article?.textContent);

    if (!content) return null;

    const capped = capLength(content, MAX_READABLE_CONTENT_LENGTH);
    return {
      content: capped,
      length: capped.length,
    };
  } catch {
    return null;
  }
}

function removePageChrome(document: Document): void {
  document
    .querySelectorAll("script, style, noscript, nav, footer, aside")
    .forEach((element) => element.remove());
}

function normalizeReadableContent(value: string | null | undefined): string {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

function capLength(value: string, max: number): string {
  return value.length > max ? value.slice(0, max).trimEnd() : value;
}

// M3: hardened page fetch for Import. Thin I/O wrapper that isolates the
// SSRF/abuse/reliability hardening: request timeout, explicit User-Agent,
// text/html content-type check, and a response size cap. Not unit-tested
// directly (network-bound); exercised via importBookmark's stubbed fetcher.

export type FetchPageResult =
  | { ok: true; html: string }
  | { ok: false; error: string };

const TIMEOUT_MS = 5000;
const MAX_BYTES = 2_000_000;
const USER_AGENT =
  "CacheBookmarkBot/1.0 (+https://github.com; bookmark metadata importer)";

export async function fetchPage(url: string): Promise<FetchPageResult> {
  let response: Response;
  try {
    response = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "text/html,application/xhtml+xml",
      },
    });
  } catch {
    return { ok: false, error: "Could not reach the page" };
  }

  if (!response.ok) {
    return { ok: false, error: `Page responded with ${response.status}` };
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("text/html")) {
    return { ok: false, error: "Page is not HTML" };
  }

  const html = await readCapped(response, MAX_BYTES);
  if (html === null) {
    return { ok: false, error: "Could not read the page" };
  }

  return { ok: true, html };
}

// Reads at most `maxBytes` from the response body, truncating anything beyond
// the cap so a huge or slow page can't exhaust the Worker. Metadata lives in
// <head>, so a truncated prefix is enough to parse.
async function readCapped(
  response: Response,
  maxBytes: number,
): Promise<string | null> {
  if (!response.body) return null;

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;

  try {
    while (total < maxBytes) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      total += value.byteLength;
    }
  } catch {
    return null;
  } finally {
    await reader.cancel().catch(() => {});
  }

  const merged = new Uint8Array(Math.min(total, maxBytes));
  let offset = 0;
  for (const chunk of chunks) {
    const room = merged.length - offset;
    if (room <= 0) break;
    const slice = chunk.length > room ? chunk.subarray(0, room) : chunk;
    merged.set(slice, offset);
    offset += slice.length;
  }

  // Default decoder is UTF-8 and replaces invalid sequences (non-fatal).
  return new TextDecoder().decode(merged);
}

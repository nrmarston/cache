// M1: pure URL validation + SSRF guard for the Import feature.
//
// Accepts only http/https URLs and rejects hosts that point at the Worker's
// own network: localhost, loopback, link-local, and private IPv4 ranges.
// Returns the parsed (normalized) URL so callers can read `.href`/`.hostname`.

export type ValidateUrlResult =
  | { ok: true; value: URL }
  | { ok: false; error: string };

export function validateImportUrl(input: unknown): ValidateUrlResult {
  if (typeof input !== "string" || input.trim().length === 0) {
    return { ok: false, error: "A URL is required" };
  }

  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    return { ok: false, error: "Enter a valid URL, including https://" };
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return { ok: false, error: "Only http and https URLs can be imported" };
  }

  if (isBlockedHostname(url.hostname)) {
    return { ok: false, error: "That address is not allowed" };
  }

  return { ok: true, value: url };
}

function isBlockedHostname(hostname: string): boolean {
  const host = hostname.toLowerCase();

  if (host === "localhost" || host.endsWith(".localhost")) {
    return true;
  }

  // `URL.hostname` wraps IPv6 literals in brackets, e.g. "[::1]".
  const stripped =
    host.startsWith("[") && host.endsWith("]") ? host.slice(1, -1) : host;

  if (stripped === "::1" || stripped === "::" || stripped === "0.0.0.0") {
    return true;
  }

  const octets = parseIPv4(stripped);
  if (octets) {
    const [a, b] = octets;
    if (a === 0) return true; // "this" network
    if (a === 127) return true; // loopback 127.0.0.0/8
    if (a === 10) return true; // private 10.0.0.0/8
    if (a === 169 && b === 254) return true; // link-local 169.254.0.0/16
    if (a === 172 && b >= 16 && b <= 31) return true; // private 172.16.0.0/12
    if (a === 192 && b === 168) return true; // private 192.168.0.0/16
  }

  return false;
}

function parseIPv4(host: string): [number, number, number, number] | null {
  const parts = host.split(".");
  if (parts.length !== 4) return null;
  if (!parts.every((part) => /^\d{1,3}$/.test(part))) return null;

  const octets = parts.map((part) => Number(part));
  if (octets.some((n) => n > 255)) return null;

  return octets as [number, number, number, number];
}

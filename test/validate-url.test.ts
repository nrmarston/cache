import { describe, expect, it } from "vitest";
import { validateImportUrl } from "../src/worker/import/validate-url";

describe("validateImportUrl", () => {
  it("accepts http/https and returns the normalized URL", () => {
    const https = validateImportUrl("https://example.com/path");
    expect(https.ok).toBe(true);
    if (https.ok) {
      expect(https.value.href).toBe("https://example.com/path");
    }

    expect(validateImportUrl("http://example.com").ok).toBe(true);
  });

  it("rejects non-http(s) schemes", () => {
    for (const url of [
      "ftp://example.com",
      "file:///etc/passwd",
      "javascript:alert(1)",
      "data:text/html,hi",
    ]) {
      expect(validateImportUrl(url).ok, url).toBe(false);
    }
  });

  it("rejects a host with no scheme", () => {
    expect(validateImportUrl("example.com").ok).toBe(false);
    expect(validateImportUrl("www.example.com/path").ok).toBe(false);
  });

  it("rejects malformed or empty input", () => {
    expect(validateImportUrl("not a url").ok).toBe(false);
    expect(validateImportUrl("").ok).toBe(false);
    expect(validateImportUrl("   ").ok).toBe(false);
    expect(validateImportUrl(123).ok).toBe(false);
    expect(validateImportUrl(null).ok).toBe(false);
  });

  it("rejects localhost, loopback, link-local, and private ranges", () => {
    const blocked = [
      "http://localhost",
      "http://localhost:3000/x",
      "http://app.localhost",
      "http://127.0.0.1",
      "http://127.5.5.5",
      "https://[::1]/",
      "http://169.254.169.254/latest/meta-data",
      "http://10.0.0.1",
      "http://172.16.0.1",
      "http://172.31.255.255",
      "http://192.168.1.1",
      "http://0.0.0.0",
    ];
    for (const url of blocked) {
      expect(validateImportUrl(url).ok, url).toBe(false);
    }
  });

  it("allows public hosts adjacent to the private ranges", () => {
    expect(validateImportUrl("http://172.32.0.1").ok).toBe(true);
    expect(validateImportUrl("http://11.0.0.1").ok).toBe(true);
    expect(validateImportUrl("http://192.169.0.1").ok).toBe(true);
  });
});

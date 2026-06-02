export const IMPORT_BOOKMARK_COMMAND_COPY = {
  title: "Add bookmark",
  description: "Paste a URL to save it.",
  placeholder: "Paste a URL",
  actionLabel: "Save this URL",
  emptyState: "Paste a URL to save it.",
  invalidUrl: "Enter a valid URL, including https://",
  saving: "Saving…",
  duplicate: "Already saved. This URL is already in your bookmarks.",
} as const;

// Mirrors the server's scheme check so the save action only appears for a
// URL the Import endpoint would accept (host-level SSRF checks stay server-side).
function parseHttpUrl(value: string): URL | null {
  try {
    const url = new URL(value.trim());
    return url.protocol === "http:" || url.protocol === "https:" ? url : null;
  } catch {
    return null;
  }
}

export function getImportCommandAction(
  value: string,
): { value: string; label: string } | null {
  const url = parseHttpUrl(value);
  if (!url) return null;

  return {
    value: url.href,
    label: IMPORT_BOOKMARK_COMMAND_COPY.actionLabel,
  };
}

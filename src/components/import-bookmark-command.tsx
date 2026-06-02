import { useCallback, useEffect, useState } from "react";
import {
  LinkIcon,
  SpinnerGapIcon,
  WarningCircleIcon,
} from "@phosphor-icons/react";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

type ImportStatus = "idle" | "saving" | "error";

type ImportBookmarkCommandProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImported: () => void;
};

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

export function ImportBookmarkCommand({
  open,
  onOpenChange,
  onImported,
}: ImportBookmarkCommandProps) {
  const [value, setValue] = useState("");
  const [status, setStatus] = useState<ImportStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [duplicate, setDuplicate] = useState(false);

  // ⌘K / Ctrl+K opens the palette from anywhere on the page.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key.toLowerCase() === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        onOpenChange(true);
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onOpenChange]);

  // Reset transient state on close so the next open starts clean.
  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (!next) {
        setValue("");
        setStatus("idle");
        setError(null);
        setDuplicate(false);
      }
      onOpenChange(next);
    },
    [onOpenChange],
  );

  const parsedUrl = parseHttpUrl(value);

  const submit = useCallback(async () => {
    if (status === "saving") return;
    const url = parseHttpUrl(value);
    if (!url) return;

    setStatus("saving");
    setError(null);
    setDuplicate(false);

    try {
      const response = await fetch("/api/bookmarks/import", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.href }),
      });

      if (response.status === 201) {
        onImported();
        handleOpenChange(false);
        return;
      }

      if (response.status === 200) {
        // Already saved: surface inline, don't add a second entry.
        setStatus("idle");
        setDuplicate(true);
        return;
      }

      const message = await response.text();
      setStatus("error");
      setError(message || `Import failed with ${response.status}`);
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Import failed");
    }
  }, [handleOpenChange, onImported, status, value]);

  return (
    <CommandDialog
      open={open}
      onOpenChange={handleOpenChange}
      title="Add bookmark"
      description="Paste a URL to save it as a bookmark."
    >
      <Command shouldFilter={false}>
        <CommandInput
          value={value}
          onValueChange={(next) => {
            setValue(next);
            if (status === "error") {
              setStatus("idle");
              setError(null);
            }
            if (duplicate) setDuplicate(false);
          }}
          placeholder="Paste a URL to save…"
          autoFocus
        />
        <CommandList>
          {status === "saving" ? (
            <CommandGroup>
              <CommandItem value="saving" disabled>
                <SpinnerGapIcon className="animate-spin" />
                <span>Saving…</span>
              </CommandItem>
            </CommandGroup>
          ) : parsedUrl ? (
            <CommandGroup>
              <CommandItem value={parsedUrl.href} onSelect={() => void submit()}>
                <LinkIcon />
                <span className="truncate">
                  Save bookmark: {parsedUrl.href}
                </span>
              </CommandItem>
            </CommandGroup>
          ) : (
            <CommandEmpty>
              {value.trim()
                ? "Enter a valid URL, including https://"
                : "Paste a URL to save it."}
            </CommandEmpty>
          )}
        </CommandList>

        {duplicate ? (
          <p className="px-3 py-2 text-sm text-muted-foreground">
            Already saved — this URL is already in your bookmarks.
          </p>
        ) : null}

        {error ? (
          <p className="flex items-center gap-2 px-3 py-2 text-sm text-destructive">
            <WarningCircleIcon className="size-4 shrink-0" />
            {error}
          </p>
        ) : null}
      </Command>
    </CommandDialog>
  );
}

import { useCallback, useEffect, useState } from "react";
import {
  BookmarkSimpleIcon,
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
import {
  getImportCommandAction,
  IMPORT_BOOKMARK_COMMAND_COPY,
} from "@/components/import-bookmark-command-copy";

type ImportStatus = "idle" | "saving" | "error";

type ImportBookmarkCommandProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImported: () => void;
};

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

  const importAction = getImportCommandAction(value);

  const submit = useCallback(async () => {
    if (status === "saving") return;
    if (!importAction) return;

    setStatus("saving");
    setError(null);
    setDuplicate(false);

    try {
      const response = await fetch("/api/bookmarks/import", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: importAction.value }),
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
  }, [handleOpenChange, importAction, onImported, status]);

  return (
    <CommandDialog
      open={open}
      onOpenChange={handleOpenChange}
      title={IMPORT_BOOKMARK_COMMAND_COPY.title}
      description={IMPORT_BOOKMARK_COMMAND_COPY.description}
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
          placeholder={IMPORT_BOOKMARK_COMMAND_COPY.placeholder}
          autoFocus
        />
        <CommandList>
          {status === "saving" ? (
            <CommandGroup>
              <CommandItem value="saving" disabled>
                <SpinnerGapIcon className="animate-spin" />
                <span>{IMPORT_BOOKMARK_COMMAND_COPY.saving}</span>
              </CommandItem>
            </CommandGroup>
          ) : importAction ? (
            <CommandGroup>
              <CommandItem
                value={importAction.value}
                onSelect={() => void submit()}
              >
                <BookmarkSimpleIcon className="text-primary" weight="fill" />
                <span>{importAction.label}</span>
              </CommandItem>
            </CommandGroup>
          ) : (
            <CommandEmpty>
              {value.trim()
                ? IMPORT_BOOKMARK_COMMAND_COPY.invalidUrl
                : IMPORT_BOOKMARK_COMMAND_COPY.emptyState}
            </CommandEmpty>
          )}
        </CommandList>

        {duplicate ? (
          <p className="px-3 py-2 text-sm text-muted-foreground">
            {IMPORT_BOOKMARK_COMMAND_COPY.duplicate}
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

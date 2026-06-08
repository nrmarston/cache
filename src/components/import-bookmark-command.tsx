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
import { importBookmarkByUrl } from "@/react-app/bookmark-api";
import type { Bookmark } from "@/react-app/bookmark-types";

type ImportStatus = "idle" | "saving" | "error";

type ImportBookmarkCommandProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportStarted: (url: string) => string;
  onImported: (bookmark: Bookmark, optimisticId: string) => void;
  onImportFailed: (optimisticId: string, message: string) => void;
};

export function ImportBookmarkCommand({
  open,
  onOpenChange,
  onImportStarted,
  onImported,
  onImportFailed,
}: ImportBookmarkCommandProps) {
  const [value, setValue] = useState("");
  const [status, setStatus] = useState<ImportStatus>("idle");
  const [error, setError] = useState<string | null>(null);

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
    const optimisticId = onImportStarted(importAction.value);
    handleOpenChange(false);

    try {
      const result = await importBookmarkByUrl(importAction.value);
      onImported(result.bookmark, optimisticId);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Import failed";
      onImportFailed(optimisticId, message);
      setStatus("error");
      setError(message);
    }
  }, [
    handleOpenChange,
    importAction,
    onImportFailed,
    onImportStarted,
    onImported,
    status,
  ]);

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

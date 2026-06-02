# Import dialog polish: keyboard shortcut and inline states

Status: done

## Parent

`.scratch/import-bookmark-from-url/PRD.md`

## What to build

Round out the Import dialog UX. Add a global ⌘K / Ctrl+K listener that opens the dialog, and ensure Esc closes it (cmdk default). While an Import is in flight, show a "Saving…" indication and prevent double-submit. If the Import fails unexpectedly, keep the dialog open and show an inline error so the User can retry or fix the URL.

This slice enhances the existing Import path from the tracer; it adds no new backend behavior.

Demoable: ⌘K opens the dialog from anywhere on the Bookmarks page; saving shows "Saving…"; a forced failure shows an inline error with the dialog still open; Esc closes the dialog.

## Acceptance criteria

- [x] ⌘K (macOS) / Ctrl+K (other) opens the Import dialog
- [x] Esc closes the dialog
- [x] An in-flight Import shows a "Saving…" state and prevents a second concurrent submit
- [x] An unexpected Import failure keeps the dialog open and shows an inline error message
- [x] On success the dialog still closes and the list refetches (unchanged from the tracer)

## Blocked by

- `.scratch/import-bookmark-from-url/issues/01-tracer-paste-url-saves-bookmark.md`

(Can run in parallel with issues 02-04.)

## Comments

All handled in `src/components/import-bookmark-command.tsx`:

- Global `keydown` listener opens the dialog on ⌘K / Ctrl+K (`event.preventDefault()` to override browser defaults). Esc closes via the Base UI Dialog default.
- `status === "saving"` renders a disabled "Saving…" item with a spinner and the submit guard ignores re-entry, preventing double-submit.
- Unexpected failures (network error or a non-200/201 response) set an inline error and keep the dialog open; the input clearing the error on edit. Success refetches and closes (transient state resets on close).

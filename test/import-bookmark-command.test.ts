import { describe, expect, it } from "vitest";
import {
  getImportCommandAction,
  IMPORT_BOOKMARK_COMMAND_COPY,
} from "../src/components/import-bookmark-command-copy";

describe("ImportBookmarkCommand", () => {
  it("shows a short save action for a valid URL", () => {
    expect(
      getImportCommandAction("https://graydon2.dreamwidth.org/193447.html"),
    ).toEqual({
      value: "https://graydon2.dreamwidth.org/193447.html",
      label: "Save this URL",
    });
  });

  it("keeps nearby palette copy aligned with the short action label", () => {
    expect(IMPORT_BOOKMARK_COMMAND_COPY).toMatchObject({
      description: "Paste a URL to save it.",
      placeholder: "Paste a URL",
    });
  });
});

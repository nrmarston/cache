import { renderToStaticMarkup } from "react-dom/server";
import * as React from "react";
import { describe, expect, it, vi } from "vitest";
import { ThemeProvider } from "@/components/theme-provider";
import { ModeToggle } from "@/components/mode-toggle";

describe("ModeToggle", () => {
  it("renders the dropdown trigger as one button without leaking asChild", () => {
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: {
        getItem: vi.fn(() => null),
        setItem: vi.fn(),
      },
    });

    const html = renderToStaticMarkup(
      <ThemeProvider>
        <ModeToggle />
      </ThemeProvider>,
    );

    expect(html.match(/<button/g)).toHaveLength(1);
    expect(html).not.toContain("asChild");
  });
});

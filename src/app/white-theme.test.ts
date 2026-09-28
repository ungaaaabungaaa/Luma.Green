import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import en from "../../messages/en.json";

// Vitest runs from the repo root.
const css = readFileSync(
  path.join(process.cwd(), "src/app/globals.css"),
  "utf8",
);

describe("white theme only (docs/decisions/0010)", () => {
  it("defines no dark token block", () => {
    expect(css).not.toMatch(/^\.dark\s*\{/m);
  });

  it("keeps shadcn's dark: utilities tied to a class we never set", () => {
    // Without this line Tailwind falls back to prefers-color-scheme and
    // vendored components would turn dark on phones in dark mode.
    expect(css).toContain("@custom-variant dark (&:is(.dark *));");
  });

  it("ships no theme-switcher copy", () => {
    expect(Object.keys(en.common)).not.toContain("theme");
  });
});

import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const css = readFileSync(
  path.join(process.cwd(), "src/app/globals.css"),
  "utf8",
);

// The interactive theme behavior is tested beside ThemeProvider. These checks
// guard the CSS contract that JavaScript alone cannot exercise in jsdom.
describe("shared light and dark theme", () => {
  it("keeps component dark styles under the chosen root class", () => {
    expect(css).toContain("@custom-variant dark (&:is(.dark *));");
  });

  it("supplies the semantic surfaces and readable text for both modes", () => {
    const light = /:root\s*\{([^}]+)\}/.exec(css)?.[1] ?? "";
    const dark = /\.dark\s*\{([^}]+)\}/.exec(css)?.[1] ?? "";
    for (const token of [
      "background",
      "foreground",
      "card",
      "card-foreground",
      "popover",
      "popover-foreground",
      "primary",
      "primary-foreground",
      "muted",
      "muted-foreground",
      "border",
      "input",
      "ring",
      "sidebar",
      "sidebar-foreground",
    ]) {
      expect(light, `Light theme is missing ${token}`).toContain(`--${token}:`);
      expect(dark, `Dark theme is missing ${token}`).toContain(`--${token}:`);
    }
  });
});

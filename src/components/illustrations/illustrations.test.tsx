import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { type IllustrationName, illustrations, KabadiShop } from "./index";

const names = Object.keys(illustrations) as IllustrationName[];

/**
 * The set's palette: brand greens, warm neutrals, and sky for glass and
 * panels. Every colour is a theme token used through a class.
 */
const PALETTE =
  /^(fill|stroke)-(white|(brand|stone|amber|orange|sky)-(50|[1-9]00|950))$/;

describe("illustrations", () => {
  it("ships the full set of twelve", () => {
    expect(names.toSorted((a, b) => a.localeCompare(b))).toEqual([
      "autoPickup",
      "escrowShield",
      "factory",
      "handshake",
      "householdScrap",
      "kabadiShop",
      "recyclerMachine",
      "saathiWorker",
      "smsCodePhone",
      "solarRoof",
      "weighingScale",
      "yardBales",
    ]);
  });

  it.each(names)("%s is decorative unless it's given a title", (name) => {
    const Art = illustrations[name];
    const { container, unmount } = render(<Art />);
    const svg = container.querySelector("svg");
    expect(svg).toHaveAttribute("aria-hidden", "true");
    expect(svg).toHaveAttribute("viewBox", "0 0 240 180");
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    unmount();

    render(<Art title="A picture" />);
    expect(screen.getByRole("img", { name: "A picture" })).toBeInTheDocument();
  });

  it.each(names)("%s draws only with theme colours", (name) => {
    const Art = illustrations[name];
    const { container } = render(<Art />);
    const shapes = [...container.querySelectorAll(":scope svg *")];
    expect(shapes.length).toBeGreaterThan(5);

    for (const shape of shapes) {
      // No inline colours: a raw fill or stroke would dodge the tokens.
      for (const attribute of ["fill", "stroke"]) {
        const value = shape.getAttribute(attribute);
        if (value !== null) expect(value).toBe("none");
      }
      expect(shape).not.toHaveAttribute("style");
      for (const name of shape.classList) {
        expect(name).toMatch(PALETTE);
      }
    }
  });

  it("takes sizing from the caller", () => {
    const { container } = render(<KabadiShop className="max-w-40" />);
    const svg = container.querySelector("svg");
    expect(svg).toHaveClass("max-w-40");
    expect(svg).not.toHaveClass("max-w-60");
  });
});

import { describe, expect, it } from "vitest";

import { parallaxDistance, revealTargets } from "./reveal-targets";

describe("motion boundaries", () => {
  it("moves artwork less on small screens and caps unsafe distances", () => {
    expect(parallaxDistance("40", false)).toBe(40);
    expect(parallaxDistance("40", true)).toBe(20);
    expect(parallaxDistance("-1000", false)).toBe(-64);
    expect(parallaxDistance("1000", false)).toBe(64);
    expect(parallaxDistance("oops", false)).toBe(32);
  });

  it("reveals a card once instead of independently moving its nested content", () => {
    const scope = document.createElement("div");
    scope.innerHTML =
      "<h1>Title</h1><section data-reveal><h2>Card</h2><div data-reveal>Body</div></section><section><h2>Other title</h2></section>";
    const targets = revealTargets(scope);
    expect(targets.map((element) => element.textContent)).toEqual([
      "Title",
      "CardBody",
      "Other title",
    ]);
  });
});

import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const assets = [
  "household-sorting.webp",
  "collection-partners.webp",
  "material-yard.webp",
  "circular-workshop.webp",
  "kabadiwala-weighing.webp",
  "recycling-line.webp",
  "operations-desk.webp",
  "solar-rooftop.webp",
];

describe("public showcase image budget", () => {
  it("keeps all eight additional sources below 1.44 MB combined", () => {
    let total = 0;
    for (const name of assets) {
      const bytes = readFileSync(`public/images/showcase/${name}`);
      expect(bytes.byteLength, name).toBeLessThanOrEqual(180_000);
      expect(bytes.subarray(0, 4).toString(), name).toBe("RIFF");
      expect(bytes.subarray(8, 12).toString(), name).toBe("WEBP");
      total += bytes.byteLength;
    }
    expect(total).toBeLessThanOrEqual(1_440_000);
  });
});

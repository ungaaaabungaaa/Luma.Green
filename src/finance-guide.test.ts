import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

import { afterEach, describe, expect, it, vi } from "vitest";

import { financeFixture } from "../scripts/guide-preview/finance-fixtures";

const hash = (file: string) =>
  createHash("sha256").update(readFileSync(file)).digest("hex");
afterEach(() => {
  vi.unstubAllGlobals();
});
function location(pathname: string, search: string) {
  vi.stubGlobal("window", { location: { pathname, search } });
}

describe("isolated financial guide examples", () => {
  it("does not inject financial state into ordinary trade fixtures", () => {
    location("/en/app/trades", "?scenario=authorized-dispatch");
    expect(financeFixture({ tradeId: "guide-finance-example" })).toBeNull();
  });
  it("requires the exact example identity and an explicit scenario", () => {
    location("/en/app/finance-example", "?scenario=authorized-dispatch");
    expect(financeFixture({ tradeId: "other-trade" })).toBeNull();
    expect(financeFixture(undefined)).toBeNull();
    location("/en/app/finance-example", "?scenario=unknown");
    expect(() => financeFixture({ tradeId: "guide-finance-example" })).toThrow(
      "explicit synthetic",
    );
  });
  it("provides only the selected synthetic dispatch interface state", () => {
    location("/kn/app/finance-example", "?scenario=authorized-dispatch");
    expect(financeFixture({ tradeId: "guide-finance-example" })).toMatchObject({
      state: "authorized",
      actions: ["dispatch"],
      grams: 1000,
      settlement: "pending",
      refund: "none",
    });
  });
  it("holds the example without an actionable financial operation", () => {
    location("/ar/app/finance-example", "?scenario=financial-hold");
    expect(financeFixture({ tradeId: "guide-finance-example" })).toMatchObject({
      state: "hold",
      collection: "review",
      actions: [],
    });
  });
  it("retains all reviewed financial interface originals with exact source hashes", () => {
    const evidence = JSON.parse(
      readFileSync("docs/user-guide/finance-fixture-captures.json", "utf8"),
    ) as {
      sourceHashes: Record<string, string>;
      buildStyles: Record<string, string>;
      screenshots: {
        file: string;
        sha256: string;
        authenticated: boolean;
        providerExecutionTested: boolean;
        writesAttempted: boolean;
        sourceKind: string;
        blockedRequests: number;
        browserErrors: number;
      }[];
      visualReview: { status: string };
    };
    expect(evidence.screenshots).toHaveLength(36);
    expect(evidence.visualReview.status).toBe("passed");
    expect(Object.keys(evidence.buildStyles).length).toBeGreaterThan(0);
    const expected = ["en", "ar", "kn"].flatMap((locale) =>
      ["light", "dark"].flatMap((theme) =>
        [390, 768, 1440].flatMap((width) =>
          ["authorized-dispatch", "financial-hold"].map(
            (scenario) =>
              `screenshots/finance-fixture-${scenario}-${locale}-${theme}-${String(width)}.png`,
          ),
        ),
      ),
    );
    expect(
      evidence.screenshots
        .map(({ file }) => file)
        .toSorted((a, b) => a.localeCompare(b)),
    ).toEqual(expected.toSorted((a, b) => a.localeCompare(b)));
    for (const [file, digest] of Object.entries(evidence.sourceHashes))
      expect(hash(file), file).toBe(digest);
    for (const screenshot of evidence.screenshots) {
      expect(hash(`docs/user-guide/${screenshot.file}`)).toBe(
        screenshot.sha256,
      );
      expect(screenshot.sourceKind).toBe(
        "synthetic-financial-interface-example",
      );
      expect(screenshot.authenticated).toBe(false);
      expect(screenshot.providerExecutionTested).toBe(false);
      expect(screenshot.writesAttempted).toBe(false);
      expect(screenshot.blockedRequests).toBe(0);
      expect(screenshot.browserErrors).toBe(0);
    }
  });
});

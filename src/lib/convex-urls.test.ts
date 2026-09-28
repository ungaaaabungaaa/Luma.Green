import { describe, expect, it } from "vitest";

import { convexSiteUrlFrom } from "./convex-urls";

describe("convexSiteUrlFrom", () => {
  it("swaps the cloud host for the site host", () => {
    expect(
      convexSiteUrlFrom("https://glorious-rooster-470.eu-west-1.convex.cloud"),
    ).toBe("https://glorious-rooster-470.eu-west-1.convex.site");
    expect(convexSiteUrlFrom("https://happy-otter-123.convex.cloud/")).toBe(
      "https://happy-otter-123.convex.site",
    );
  });

  it("leaves anything else alone", () => {
    expect(convexSiteUrlFrom("http://127.0.0.1:3210")).toBeUndefined();
    expect(convexSiteUrlFrom("https://api.example.com")).toBeUndefined();
    expect(convexSiteUrlFrom("not a url")).toBeUndefined();
  });
});

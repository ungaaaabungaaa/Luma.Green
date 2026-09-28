import { describe, expect, it } from "vitest";

import { safeNextPath } from "./safe-next";

describe("safeNextPath", () => {
  it("keeps a relative path on this site", () => {
    expect(safeNextPath("/join", "/")).toBe("/join");
    expect(safeNextPath("/join/kabadiwala?step=2", "/")).toBe(
      "/join/kabadiwala?step=2",
    );
    // Percent-encoding stays a path on this site.
    expect(safeNextPath("/%2F%2Fevil.example", "/")).toBe(
      "/%2F%2Fevil.example",
    );
  });

  it.each([
    [null, "missing"],
    ["", "empty"],
    ["join", "not rooted"],
    ["//evil.example", "protocol-relative"],
    [String.raw`/\evil.example`, "backslash trick"],
    ["https://evil.example", "absolute URL"],
    ["javascript:alert(1)", "script URL"],
    ["/ evil", "whitespace"],
    ["/\tevil", "tab"],
  ])("falls back for %s (%s)", (value, _why) => {
    expect(safeNextPath(value, "/fallback")).toBe("/fallback");
  });
});

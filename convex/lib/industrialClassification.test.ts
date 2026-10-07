import { describe, expect, it } from "vitest";

import { registrationDateStatus } from "./industrialClassification";

describe("facility registration date status in India", () => {
  it("expires at Indian midnight rather than UTC midnight", () => {
    expect(
      registrationDateStatus(
        "2026-01-01",
        "2026-10-06",
        Date.parse("2026-10-06T18:29:59.999Z"),
      ),
    ).toBe("current");
    expect(
      registrationDateStatus(
        "2026-01-01",
        "2026-10-06",
        Date.parse("2026-10-06T18:30:00.000Z"),
      ),
    ).toBe("expired");
  });
  it("starts the declared date interval at Indian midnight", () => {
    expect(
      registrationDateStatus(
        "2026-10-07",
        "2027-10-07",
        Date.parse("2026-10-06T18:29:59.999Z"),
      ),
    ).toBe("not_yet_current");
    expect(
      registrationDateStatus(
        "2026-10-07",
        "2027-10-07",
        Date.parse("2026-10-06T18:30:00.000Z"),
      ),
    ).toBe("current");
  });
});

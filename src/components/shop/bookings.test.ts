import { ConvexError } from "convex/values";
import { describe, expect, it } from "vitest";

import {
  actionErrorKey,
  areaOf,
  errorCode,
  firstName,
  relativeDay,
  splitDue,
} from "./bookings";

describe("relativeDay", () => {
  it("names the days next to today, across a month end", () => {
    expect(relativeDay("2026-09-30", "2026-09-30")).toBe("today");
    expect(relativeDay("2026-10-01", "2026-09-30")).toBe("tomorrow");
    expect(relativeDay("2026-09-29", "2026-09-30")).toBe("yesterday");
    expect(relativeDay("2026-10-02", "2026-09-30")).toBeNull();
  });
});

describe("areaOf", () => {
  it("keeps only the area, the last part before the city", () => {
    expect(
      areaOf("Flat 4B, Rose Apartments, Yeshwanthpur, Bengaluru", "Bengaluru"),
    ).toBe("Yeshwanthpur");
    expect(
      areaOf("22, 2nd Cross, Mathikere, bengaluru 560054", "Bengaluru"),
    ).toBe("Mathikere");
    expect(areaOf("Nandini Layout, Bengaluru", "Bengaluru")).toBe(
      "Nandini Layout",
    );
  });

  it("leaves an area alone", () => {
    expect(areaOf("Yeshwanthpur", "Bengaluru")).toBe("Yeshwanthpur");
  });
});

describe("firstName", () => {
  it("shows the first name only", () => {
    expect(firstName("Priya Sharma")).toBe("Priya");
    expect(firstName("  Meena   Iyer ")).toBe("Meena");
    expect(firstName("Rahul")).toBe("Rahul");
    expect(firstName(undefined)).toBeUndefined();
    expect(firstName(" ".repeat(3))).toBeUndefined();
  });
});

describe("splitDue", () => {
  it("puts today's and late pickups first, and keeps the rest for later", () => {
    const bookings = [
      { id: "late", slotDate: "2026-09-28" },
      { id: "today", slotDate: "2026-09-29" },
      { id: "tomorrow", slotDate: "2026-09-30" },
    ];
    const { due, later } = splitDue(bookings, "2026-09-29");
    expect(due.map((booking) => booking.id)).toEqual(["late", "today"]);
    expect(later.map((booking) => booking.id)).toEqual(["tomorrow"]);
  });
});

describe("errors", () => {
  it("reads the code a Convex function failed with", () => {
    expect(errorCode(new ConvexError("BELOW_FLOOR"))).toBe("BELOW_FLOOR");
    expect(errorCode(new Error("network"))).toBeNull();
  });

  it("says the request changed when someone else moved it first", () => {
    expect(actionErrorKey(new ConvexError("WRONG_STATUS"))).toBe("changed");
    expect(actionErrorKey(new ConvexError("NOT_FOUND"))).toBe("changed");
    expect(actionErrorKey(new ConvexError("INVALID_WEIGHT"))).toBe("generic");
    expect(actionErrorKey(new Error("offline"))).toBe("generic");
  });
});

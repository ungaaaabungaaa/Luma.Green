import { ConvexError } from "convex/values";
import { describe, expect, it } from "vitest";

import messages from "../../../messages/en.json";
import { sellErrorKey, stepToFix } from "./errors";

describe("booking errors", () => {
  it("names each refusal the server can send", () => {
    expect(sellErrorKey(new ConvexError("SHOP_NO_PICKUP"))).toBe(
      "SHOP_NO_PICKUP",
    );
    expect(sellErrorKey(new ConvexError("SLOT_PASSED"))).toBe("SLOT_PASSED");
  });

  it("calls anything else generic", () => {
    expect(sellErrorKey(new ConvexError("SOMETHING_NEW"))).toBe("generic");
    expect(sellErrorKey(new Error("network down"))).toBe("generic");
    expect(sellErrorKey("oops")).toBe("generic");
  });

  it("sends the household to the step where they can fix it", () => {
    expect(stepToFix("SHOP_NO_PICKUP")).toBe("shop");
    expect(stepToFix("SLOT_PASSED")).toBe("when");
    expect(stepToFix("INVALID_KG")).toBe("basket");
    expect(stepToFix("TOO_MANY_OPEN")).toBeNull();
    expect(stepToFix("generic")).toBeNull();
  });

  it("has a message for every key", () => {
    const keys = [
      "generic",
      "EMPTY_BASKET",
      "SHOP_NO_PICKUP",
      "SLOT_PASSED",
      "TOO_MANY_OPEN",
      "NOT_YOURS",
    ] as const;
    for (const key of keys) {
      expect(messages.sell.errors[key]).toBeTruthy();
    }
  });
});

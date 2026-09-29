import { ConvexError } from "convex/values";
import { describe, expect, it } from "vitest";

import messages from "../../../messages/en.json";
import { MARKET_ERRORS, marketErrorKey } from "./errors";

describe("marketErrorKey", () => {
  it("names the server's reason when it's one we explain", () => {
    expect(marketErrorKey(new ConvexError("NOT_ENOUGH_STOCK"))).toBe(
      "NOT_ENOUGH_STOCK",
    );
    expect(marketErrorKey(new ConvexError({ code: "WRONG_STEP" }))).toBe(
      "WRONG_STEP",
    );
  });

  it("falls back to a general message for anything else", () => {
    expect(marketErrorKey(new ConvexError("SOMETHING_NEW"))).toBe("generic");
    expect(marketErrorKey(new ConvexError({ reason: "x" }))).toBe("generic");
    expect(marketErrorKey(new Error("offline"))).toBe("generic");
    expect(marketErrorKey(null)).toBe("generic");
  });

  it("has a message for every reason", () => {
    for (const key of [...MARKET_ERRORS, "generic"]) {
      expect(messages.market.errors).toHaveProperty(key);
    }
  });
});

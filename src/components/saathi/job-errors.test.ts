import { ConvexError } from "convex/values";
import { describe, expect, it } from "vitest";

import messages from "../../../messages/en.json";
import { jobErrorKey } from "./job-errors";

describe("jobErrorKey", () => {
  it("passes on the server's reason when it's one we can explain", () => {
    expect(jobErrorKey(new ConvexError("JOB_TAKEN"))).toBe("JOB_TAKEN");
    expect(jobErrorKey(new ConvexError("TOO_EARLY"))).toBe("TOO_EARLY");
  });

  it("falls back to a general message for anything else", () => {
    expect(jobErrorKey(new ConvexError("NOT_SIGNED_IN"))).toBe("generic");
    expect(jobErrorKey(new ConvexError({ code: "JOB_TAKEN" }))).toBe("generic");
    expect(jobErrorKey(new Error("offline"))).toBe("generic");
    expect(jobErrorKey(undefined)).toBe("generic");
  });

  it("has words for every reason it can return", () => {
    for (const code of [
      "JOB_TAKEN",
      "JOB_EXPIRED",
      "SLOT_BUSY",
      "NOT_YOUR_JOB",
      "ALREADY_DONE",
      "TOO_EARLY",
      "JOB_NOT_FOUND",
    ]) {
      const key = jobErrorKey(new ConvexError(code));
      expect(key).toBe(code);
      expect(messages.saathi.errors[key]).toBeTruthy();
    }
    expect(messages.saathi.errors.generic).toBeTruthy();
  });
});

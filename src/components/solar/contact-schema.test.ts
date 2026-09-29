import { ConvexError } from "convex/values";
import { describe, expect, it } from "vitest";

import { contactSchema, fieldForError, supportRoleFor } from "./contact-schema";

describe("contactSchema", () => {
  it("accepts what support.send accepts", () => {
    expect(
      contactSchema.safeParse({
        name: "  Asha ",
        phone: "098765 43210",
        message: "3 kW for my home",
      }),
    ).toMatchObject({
      success: true,
      data: { name: "Asha", message: "3 kW for my home" },
    });
  });

  it("refuses what support.send would refuse", () => {
    const result = contactSchema.safeParse({
      name: "A",
      phone: "12345",
      message: "Hi",
    });
    expect(result.success).toBe(false);
    expect(
      result.error?.issues.map((issue) => [issue.path[0], issue.message]),
    ).toEqual([
      ["name", "name"],
      ["phone", "phone"],
      ["message", "message"],
    ]);
  });
});

describe("fieldForError", () => {
  it("maps the server's refusal codes to their fields", () => {
    expect(fieldForError(new ConvexError("INVALID_NAME"))).toBe("name");
    expect(fieldForError(new ConvexError("INVALID_PHONE"))).toBe("phone");
    expect(fieldForError(new ConvexError("INVALID_MESSAGE"))).toBe("message");
  });

  it("leaves anything else to the generic message", () => {
    expect(fieldForError(new ConvexError("RATE_LIMITED"))).toBeNull();
    expect(fieldForError(new ConvexError({ code: "INVALID_NAME" }))).toBeNull();
    expect(fieldForError(new Error("INVALID_NAME"))).toBeNull();
  });
});

describe("supportRoleFor", () => {
  it("files a home as a household and a business as other", () => {
    expect(supportRoleFor("home")).toBe("household");
    expect(supportRoleFor("business")).toBe("other");
  });
});

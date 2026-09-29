import { ConvexError } from "convex/values";
import { describe, expect, it } from "vitest";

import { contactSchema, MESSAGE_MAX, serverFieldError } from "./contact-schema";
import { isSupportRole, isSupportTopic } from "./support-api";

const valid = {
  name: "Priya",
  phone: "98765 43210",
  role: "household",
  topic: "pickup",
  message: "Nobody came for my pickup today.",
} as const;

function errorsFor(input: Record<string, unknown>) {
  const result = contactSchema.safeParse(input);
  return result.success
    ? {}
    : Object.fromEntries(
        result.error.issues.map((issue) => [issue.path[0], issue.message]),
      );
}

describe("contactSchema", () => {
  it("accepts a complete message and trims what was typed", () => {
    const result = contactSchema.parse({
      ...valid,
      name: "  Priya  ",
      message: "  Nobody came.  ",
    });
    expect(result.name).toBe("Priya");
    expect(result.message).toBe("Nobody came.");
  });

  it("holds names to the server's 2–80 letters", () => {
    expect(errorsFor({ ...valid, name: " P " })).toEqual({
      name: "nameInvalid",
    });
    expect(errorsFor({ ...valid, name: "P".repeat(81) })).toEqual({
      name: "nameInvalid",
    });
  });

  it("wants an Indian mobile number, however it's typed", () => {
    expect(errorsFor({ ...valid, phone: "+91 98765-43210" })).toEqual({});
    expect(errorsFor({ ...valid, phone: "12345" })).toEqual({
      phone: "phoneInvalid",
    });
  });

  it("insists on a role and a topic", () => {
    expect(errorsFor({ ...valid, role: undefined, topic: undefined })).toEqual({
      role: "roleMissing",
      topic: "topicMissing",
    });
    expect(errorsFor({ ...valid, role: "admin" })).toEqual({
      role: "roleMissing",
    });
  });

  it("holds messages to the server's 5–1,000 characters", () => {
    expect(errorsFor({ ...valid, message: "  hi  " })).toEqual({
      message: "messageShort",
    });
    expect(errorsFor({ ...valid, message: "a".repeat(MESSAGE_MAX) })).toEqual(
      {},
    );
    expect(
      errorsFor({ ...valid, message: "a".repeat(MESSAGE_MAX + 1) }),
    ).toEqual({ message: "messageLong" });
  });
});

describe("serverFieldError", () => {
  it("maps each refusal from support.send to its field", () => {
    expect(serverFieldError(new ConvexError("INVALID_NAME"))).toEqual({
      field: "name",
      key: "nameInvalid",
    });
    expect(serverFieldError(new ConvexError("INVALID_PHONE"))).toEqual({
      field: "phone",
      key: "phoneInvalid",
    });
    expect(serverFieldError(new ConvexError("INVALID_MESSAGE"))).toEqual({
      field: "message",
      key: "messageShort",
    });
  });

  it("leaves anything else to the generic message", () => {
    expect(serverFieldError(new ConvexError("SOMETHING_ELSE"))).toBeNull();
    expect(serverFieldError(new Error("offline"))).toBeNull();
    expect(serverFieldError("nope")).toBeNull();
  });
});

describe("support contract", () => {
  it("recognises only the roles and topics the inbox accepts", () => {
    expect(isSupportRole("saathi")).toBe(true);
    expect(isSupportRole("other")).toBe(true);
    expect(isSupportRole("admin")).toBe(false);
    expect(isSupportRole(null)).toBe(false);
    expect(isSupportTopic("solar")).toBe(true);
    expect(isSupportTopic("weather")).toBe(false);
  });
});

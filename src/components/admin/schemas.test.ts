import { describe, expect, it } from "vitest";

import { adminAccountSchema, adminProfileSchema } from "./schemas";

const profile = {
  name: "Asha Rao",
  phone: "98765 43210",
  dateOfBirth: "1990-01-15",
  aadhaarLast4: "1234",
};

const account = {
  ...profile,
  email: "admin@luma.test",
  password: "correct horse battery",
  confirmPassword: "correct horse battery",
};

function firstError(result: {
  success: boolean;
  error?: { issues: { path: PropertyKey[]; message: string }[] };
}) {
  const issue = result.error?.issues[0];
  return issue ? { path: issue.path.join("."), message: issue.message } : null;
}

describe("adminProfileSchema", () => {
  it("accepts a complete profile", () => {
    expect(adminProfileSchema.safeParse(profile).success).toBe(true);
  });

  it("asks for only four Aadhaar digits", () => {
    expect(
      firstError(
        adminProfileSchema.safeParse({
          ...profile,
          aadhaarLast4: "123412341234",
        }),
      ),
    ).toEqual({
      path: "aadhaarLast4",
      message: "Enter the last four digits — nothing more.",
    });
  });

  it("refuses an admin under 18", () => {
    const year = String(new Date().getUTCFullYear() - 10);
    expect(
      firstError(
        adminProfileSchema.safeParse({
          ...profile,
          dateOfBirth: `${year}-01-01`,
        }),
      ),
    ).toEqual({
      path: "dateOfBirth",
      message: "The admin must be 18 or older.",
    });
  });
});

describe("adminAccountSchema", () => {
  it("accepts a complete account", () => {
    expect(adminAccountSchema.safeParse(account).success).toBe(true);
  });

  it("needs a 12-character password, typed twice", () => {
    expect(
      firstError(
        adminAccountSchema.safeParse({
          ...account,
          password: "short",
          confirmPassword: "short",
        }),
      ),
    ).toEqual({ path: "password", message: "Use at least 12 characters." });
    expect(
      firstError(
        adminAccountSchema.safeParse({
          ...account,
          confirmPassword: "different one!",
        }),
      ),
    ).toEqual({
      path: "confirmPassword",
      message: "The passwords don't match.",
    });
  });
});

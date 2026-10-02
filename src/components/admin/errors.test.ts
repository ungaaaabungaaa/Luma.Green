import { describe, expect, it } from "vitest";

import {
  codeErrorMessage,
  passwordErrorMessage,
  signInErrorMessage,
  signUpErrorMessage,
} from "./errors";

describe("admin auth errors", () => {
  it("never says which of email or password was wrong", () => {
    expect(
      signInErrorMessage({ status: 401, code: "INVALID_EMAIL_OR_PASSWORD" }),
    ).toBe("That email and password don't match.");
  });

  it("explains a closed sign-up and an existing account", () => {
    expect(
      signUpErrorMessage({ status: 403, code: "ADMIN_SETUP_REQUIRED" }),
    ).toMatch(/setup token/);
    expect(signUpErrorMessage({ status: 403 })).toMatch(/ADMIN_EMAIL/);
    expect(
      signUpErrorMessage({ status: 422, code: "USER_ALREADY_EXISTS" }),
    ).toMatch(/Sign in instead/);
    expect(
      signUpErrorMessage({ status: 400, code: "PASSWORD_TOO_SHORT" }),
    ).toMatch(/12/);
  });

  it("rate limits read the same everywhere", () => {
    const tooMany = signInErrorMessage({ status: 429 });
    expect(signUpErrorMessage({ status: 429 })).toBe(tooMany);
    expect(passwordErrorMessage({ status: 429 })).toBe(tooMany);
    expect(codeErrorMessage({ status: 429 }).message).toBe(tooMany);
  });

  it("sends the admin back to the start when the half-finished sign-in expired", () => {
    expect(
      codeErrorMessage({ status: 401, code: "INVALID_TWO_FACTOR_COOKIE" }),
    ).toEqual({
      message: "Your sign-in timed out. Start again.",
      restart: true,
    });
    expect(
      codeErrorMessage({ status: 401, code: "INVALID_CODE" }).restart,
    ).toBe(false);
  });
});

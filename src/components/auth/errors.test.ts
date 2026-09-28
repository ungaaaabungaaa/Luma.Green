import { describe, expect, it } from "vitest";

import { codeErrorKey } from "./errors";

describe("codeErrorKey", () => {
  it.each([
    [{ status: 400, code: "INVALID_OTP" }, "errorInvalid"],
    [{ status: 400, code: "OTP_EXPIRED" }, "errorExpired"],
    [{ status: 400, code: "OTP_NOT_FOUND" }, "errorExpired"],
    [{ status: 403, code: "TOO_MANY_ATTEMPTS" }, "errorTooMany"],
    [{ status: 429 }, "errorTooMany"],
    [{ status: 400 }, "errorInvalid"],
    [{ status: 500 }, "errorGeneric"],
    [null, "errorGeneric"],
  ] as const)("maps %o to %s", (error, key) => {
    expect(codeErrorKey(error)).toBe(key);
  });
});

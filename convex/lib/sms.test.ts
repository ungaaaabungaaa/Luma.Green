import { describe, expect, it } from "vitest";

import { codeDelivery, msg91OtpRequest } from "./sms";

describe("codeDelivery", () => {
  it("sends through MSG91 when both keys are set", () => {
    expect(
      codeDelivery({
        MSG91_AUTH_KEY: " key ",
        MSG91_OTP_TEMPLATE_ID: "tpl",
        AUTH_DEV_MODE: "true",
      }),
    ).toEqual({ kind: "msg91", authKey: "key", templateId: "tpl" });
  });

  it("logs codes in dev mode when MSG91 isn't set up", () => {
    expect(codeDelivery({ AUTH_DEV_MODE: "true" })).toEqual({ kind: "log" });
    expect(
      codeDelivery({ MSG91_AUTH_KEY: "key", AUTH_DEV_MODE: "true" }),
    ).toEqual({ kind: "log" });
  });

  it("is off otherwise — production without MSG91 never logs codes", () => {
    expect(codeDelivery({})).toEqual({ kind: "off" });
    expect(codeDelivery({ AUTH_DEV_MODE: "1" })).toEqual({ kind: "off" });
    expect(codeDelivery({ MSG91_AUTH_KEY: "key" })).toEqual({ kind: "off" });
  });
});

describe("msg91OtpRequest", () => {
  it("posts our code to the OTP API without the plus sign", () => {
    const { url, init } = msg91OtpRequest({
      phone: "+919876543210",
      code: "123456",
      authKey: "secret-key",
      templateId: "tpl-1",
    });
    const parsed = new URL(url);

    expect(parsed.origin + parsed.pathname).toBe(
      "https://control.msg91.com/api/v5/otp",
    );
    expect(parsed.searchParams.get("mobile")).toBe("919876543210");
    expect(parsed.searchParams.get("otp")).toBe("123456");
    expect(parsed.searchParams.get("template_id")).toBe("tpl-1");
    expect(parsed.searchParams.get("otp_expiry")).toBe("5");
    expect(init.method).toBe("POST");
    expect(init.headers).toMatchObject({ authkey: "secret-key" });
    // The key travels in a header, never in the URL.
    expect(url).not.toContain("secret-key");
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";

import { requestPhoneCode, verifyPhoneCode } from "./phone-auth";

const calls = vi.hoisted(() => ({ sendOtp: vi.fn(), verify: vi.fn() }));
vi.mock("@/lib/auth-client", () => ({ authClient: { phoneNumber: calls } }));
beforeEach(() => vi.resetAllMocks());

describe("phone authentication failures", () => {
  it("distinguishes an SMS quota from a provider or network failure", async () => {
    calls.sendOtp
      .mockResolvedValueOnce({ error: { status: 429 } })
      .mockResolvedValueOnce({ error: { status: 503 } })
      .mockRejectedValueOnce(new TypeError("offline"))
      .mockResolvedValueOnce({ error: null });
    expect(await requestPhoneCode("+919876543210")).toBe("sendRateLimited");
    expect(await requestPhoneCode("+919876543210")).toBe("sendFailed");
    expect(await requestPhoneCode("+919876543210")).toBe("sendFailed");
    expect(await requestPhoneCode("+919876543210")).toBeNull();
  });

  it("keeps verification retryable after a lost connection", async () => {
    calls.verify
      .mockRejectedValueOnce(new TypeError("offline"))
      .mockResolvedValueOnce({ error: { code: "OTP_EXPIRED" } })
      .mockResolvedValueOnce({ error: null });
    expect(await verifyPhoneCode("+919876543210", "123456")).toBe(
      "errorGeneric",
    );
    expect(await verifyPhoneCode("+919876543210", "123456")).toBe(
      "errorExpired",
    );
    expect(await verifyPhoneCode("+919876543210", "123456")).toBeNull();
  });
});

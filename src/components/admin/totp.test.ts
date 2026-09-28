import { describe, expect, it } from "vitest";

import { groupSecret, secretFromTotpUri } from "./totp";

describe("secretFromTotpUri", () => {
  it("reads the secret from an otpauth URI", () => {
    expect(
      secretFromTotpUri(
        "otpauth://totp/Luma.Green:admin%40luma.test?secret=JBSWY3DPEHPK3PXP&issuer=Luma.Green",
      ),
    ).toBe("JBSWY3DPEHPK3PXP");
  });

  it("returns null for anything else", () => {
    expect(secretFromTotpUri("https://example.com/?secret=nope")).toBeNull();
    expect(secretFromTotpUri("not a uri")).toBeNull();
  });
});

describe("groupSecret", () => {
  it("splits the key into groups of four for typing", () => {
    expect(groupSecret("JBSWY3DPEHPK3PXP")).toBe("JBSW Y3DP EHPK 3PXP");
    expect(groupSecret("ABCDEF")).toBe("ABCD EF");
  });
});

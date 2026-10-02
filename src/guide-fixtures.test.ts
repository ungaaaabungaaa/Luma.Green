import { describe, expect, it } from "vitest";

import {
  inboxFixture,
  securityFixture,
} from "../scripts/guide-preview/account-fixtures";
import { authClient } from "../scripts/guide-preview/auth";

describe("isolated account documentation fixtures", () => {
  it("never authenticates, changes protection or returns a secret", async () => {
    expect(authClient.useSession().data).toEqual({
      fixture: true,
      session: { id: undefined },
    });
    for (const change of [
      authClient.signOut,
      authClient.signUp.email,
      authClient.requestPasswordReset,
      authClient.resetPassword,
      ...Object.values(authClient.twoFactor),
    ])
      await expect(change()).rejects.toThrow("cannot change accounts");
    expect(securityFixture("?security=on")).toEqual({
      kind: "member",
      hasProfile: true,
      twoFactorEnabled: true,
    });
    expect(securityFixture("")?.twoFactorEnabled).toBe(false);
  });

  it("permits only a synthetic challenge transition in the failure entry", async () => {
    window.history.replaceState(null, "", "/en/account/security?scenario=totp");
    await expect(authClient.signIn.email()).rejects.toThrow(
      "cannot change accounts",
    );
    window.history.replaceState(null, "", "/failure.html?scenario=login");
    await expect(authClient.signIn.email()).rejects.toThrow(
      "cannot change accounts",
    );
    window.history.replaceState(null, "", "/failure.html?scenario=totp");
    await expect(authClient.signIn.email()).resolves.toEqual({
      data: { twoFactorRedirect: true },
      error: null,
    });
    window.history.replaceState(null, "", "/");
  });

  it("keeps inbox records synthetic and missing data separate from loading", () => {
    const ready = inboxFixture("");
    expect(ready.unreadCount).toBe(2);
    expect(ready.results).toHaveLength(3);
    for (const item of ready.results) {
      expect(item.id).toMatch(/^guide-inbox-/);
      expect(Object.keys(item).toSorted((a, b) => a.localeCompare(b))).toEqual([
        "createdAt",
        "event",
        "id",
        "read",
      ]);
    }
    expect(inboxFixture("?inbox=empty")).toEqual({
      results: [],
      status: "Exhausted",
      unreadCount: 0,
    });
    expect(inboxFixture("?inbox=loading")).toEqual({
      results: [],
      status: "LoadingFirstPage",
      unreadCount: 0,
    });
  });
});

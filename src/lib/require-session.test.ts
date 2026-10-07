import { beforeEach, expect, it, vi } from "vitest";

import { AuthServiceUnavailable } from "./auth-session";
import { requireSession } from "./require-session";

const mocks = vi.hoisted(() => ({ check: vi.fn(), redirect: vi.fn() }));
vi.mock("./auth-server", () => ({ hasServerSession: mocks.check }));
vi.mock("@/i18n/navigation", () => ({ redirect: mocks.redirect }));
beforeEach(() => vi.clearAllMocks());

it("permits a verified token without redirecting", async () => {
  mocks.check.mockResolvedValue(true);
  await requireSession("en", "/app");
  expect(mocks.redirect).not.toHaveBeenCalled();
});
it("redirects confirmed sign-out to the localized login return path", async () => {
  mocks.check.mockResolvedValue(false);
  await requireSession("kn", "/account/security");
  expect(mocks.redirect).toHaveBeenCalledExactlyOnceWith({
    href: { pathname: "/login", query: { next: "/account/security" } },
    locale: "kn",
  });
});
it("stops the private route without redirecting when auth is unavailable", async () => {
  mocks.check.mockRejectedValue(new AuthServiceUnavailable());
  await expect(requireSession("ar", "/app")).rejects.toThrow(
    AuthServiceUnavailable,
  );
  expect(mocks.redirect).not.toHaveBeenCalled();
});

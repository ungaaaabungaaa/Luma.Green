import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, expect, it, vi } from "vitest";

import { AuthServiceUnavailable } from "@/lib/auth-session";

import ConsoleLayout from "./layout";

const mocks = vi.hoisted(() => ({
  configured: true,
  check: vi.fn(),
  redirect: vi.fn(),
}));
vi.mock("@/lib/auth-server", () => ({
  get authServer() {
    return mocks.configured ? {} : undefined;
  },
  hasServerSession: mocks.check,
}));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("@/components/admin/console-shell", () => ({
  ConsoleShell: ({ children }: { children: ReactNode }) => children,
}));
vi.mock("@/components/admin/auth-shell", () => ({
  AdminAuthShell: ({ children }: { children: ReactNode }) => children,
}));
beforeEach(() => {
  vi.clearAllMocks();
  mocks.configured = true;
  mocks.redirect.mockImplementation(() => {
    throw new Error("TEST_REDIRECT");
  });
});
it("keeps the existing disconnected admin state without an auth request", async () => {
  mocks.configured = false;
  render(await ConsoleLayout({ children: <p>Private console</p> }));
  expect(
    screen.getByText("The admin console isn't switched on here"),
  ).toBeVisible();
  expect(screen.queryByText("Private console")).not.toBeInTheDocument();
  expect(mocks.check).not.toHaveBeenCalled();
});
it("redirects explicit denial before rendering the console", async () => {
  mocks.check.mockResolvedValue(false);
  await expect(
    ConsoleLayout({ children: <p>Private console</p> }),
  ).rejects.toThrow("TEST_REDIRECT");
  expect(mocks.redirect).toHaveBeenCalledWith("/admin/login");
});
it("lets availability errors reach the parent recovery boundary without rendering private children", async () => {
  mocks.check.mockRejectedValue(new AuthServiceUnavailable());
  await expect(
    ConsoleLayout({ children: <p>Private console</p> }),
  ).rejects.toThrow(AuthServiceUnavailable);
  expect(mocks.redirect).not.toHaveBeenCalled();
  expect(screen.queryByText("Private console")).not.toBeInTheDocument();
});

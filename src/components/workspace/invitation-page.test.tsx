import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { getFunctionName } from "convex/server";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

import type { api } from "../../../convex/_generated/api";
import ar from "../../../messages/ar.json";
import en from "../../../messages/en.json";
import { InvitationPage } from "./invitation-page";

const state = vi.hoisted(() => ({
  status: "ready",
  authenticated: true,
  reload: vi.fn(),
  accept: vi.fn(),
  ensure: vi.fn(),
  replace: vi.fn(),
  revoke: vi.fn(),
  signOut: vi.fn(),
  error: vi.fn(),
}));
vi.mock("convex/react", () => ({
  useConvexAuth: () => ({
    isAuthenticated: state.authenticated,
    isLoading: false,
  }),
  useQuery: (_reference: unknown, args: unknown) =>
    args === "skip"
      ? undefined
      : {
          status: state.status,
          role: "member",
          orgName: "Test yard",
        },
  useMutation: (reference: typeof api.identity.ensureProfile) =>
    getFunctionName(reference) === "identity:ensureProfile"
      ? state.ensure
      : state.accept,
}));
vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ replace: state.replace }),
}));
vi.mock("@/components/notifications/device-provider", () => ({
  lockDeviceSignOut: () => vi.fn(),
  revokeCurrentDevice: state.revoke,
}));
vi.mock("@/lib/auth-client", () => ({
  authClient: {
    useSession: () => ({
      data: {
        session: { id: "fixture-session" },
        user: { id: "fixture-user" },
      },
      isPending: false,
    }),
    signOut: state.signOut,
  },
}));
vi.mock("@/lib/reload-current-page", () => ({
  reloadCurrentPage: state.reload,
}));
vi.mock("sonner", () => ({ toast: { error: state.error } }));
beforeEach(() => {
  vi.resetAllMocks();
  state.status = "ready";
  state.authenticated = true;
  state.revoke.mockResolvedValue(undefined);
  state.signOut.mockResolvedValue({ error: null });
  window.history.replaceState(
    null,
    "",
    "/en/account/workspaces/invite?token=test-secret",
  );
});
afterEach(() => {
  vi.restoreAllMocks();
  window.history.replaceState(null, "", "/");
});
function invitation(token = "test-secret") {
  return (
    <NextIntlClientProvider locale="en" messages={en}>
      <InvitationPage token={token} />
    </NextIntlClientProvider>
  );
}
it("removes the visible token before acceptance and keeps it only in this mounted flow", async () => {
  const storage = vi.spyOn(Storage.prototype, "setItem");
  const view = render(invitation());
  expect(window.location.pathname).toBe("/en/account/workspaces/invite");
  expect(window.location.search).toBe("");
  expect(window.history.state).toBeNull();
  expect(state.accept).not.toHaveBeenCalled();
  // A router update after clearing the query cannot erase the mounted invitation.
  view.rerender(invitation(""));
  await userEvent.click(
    screen.getByRole("button", { name: en.workspace.accept }),
  );
  expect(state.ensure).toHaveBeenCalledWith({ locale: "en" });
  expect(state.accept).toHaveBeenCalledWith({ token: "test-secret" });
  expect(state.replace).toHaveBeenCalledWith("/account/workspaces");
  expect(screen.queryByText("test-secret")).not.toBeInTheDocument();
  expect(storage).not.toHaveBeenCalled();
});
it("does not repeat history cleanup when auth providers remount the invitation", () => {
  const replace = vi.spyOn(window.history, "replaceState");
  const view = render(invitation());
  expect(replace).toHaveBeenCalledOnce();
  view.unmount();
  render(invitation());
  expect(replace).toHaveBeenCalledOnce();
});
it("does not erase the login return path if an old invitation effect mounts late", () => {
  const login =
    "/en/login?next=%2Faccount%2Fworkspaces%2Finvite%3Ftoken%3Dtest-secret";
  window.history.replaceState(null, "", login);
  const replace = vi.spyOn(window.history, "replaceState");
  render(invitation());
  expect(replace).not.toHaveBeenCalled();
  expect(window.location.pathname + window.location.search).toBe(login);
});
it.each(["verifyEmail", "unavailable"])(
  "allows %s invitees to switch accounts through device revocation and preserve the invite",
  async (status) => {
    state.status = status;
    render(invitation());
    expect(
      screen.queryByRole("button", { name: en.workspace.accept }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("alert")).toBeVisible();
    expect(screen.getByText(en.workspace.switchHint)).toBeVisible();
    expect(window.location.search).toBe("");
    await userEvent.click(
      screen.getByRole("button", { name: en.workspace.switchAccount }),
    );
    expect(state.revoke.mock.invocationCallOrder[0]).toBeLessThan(
      state.signOut.mock.invocationCallOrder[0],
    );
    expect(state.signOut.mock.invocationCallOrder[0]).toBeLessThan(
      state.replace.mock.invocationCallOrder[0],
    );
    expect(state.replace).toHaveBeenCalledWith({
      pathname: "/login",
      query: { next: "/account/workspaces/invite?token=test-secret" },
    });
    expect(state.accept).not.toHaveBeenCalled();
  },
);
it("keeps the account and invitation available for retry if device revocation fails", async () => {
  state.status = "verifyEmail";
  state.revoke.mockRejectedValueOnce(new Error("offline"));
  render(invitation());
  const button = screen.getByRole("button", {
    name: en.workspace.switchAccount,
  });
  await userEvent.click(button);
  expect(state.signOut).not.toHaveBeenCalled();
  expect(state.replace).not.toHaveBeenCalled();
  expect(state.error).toHaveBeenCalledWith(en.common.error);
  await userEvent.click(
    await screen.findByRole("button", { name: en.workspace.switchAccount }),
  );
  expect(state.signOut).toHaveBeenCalledOnce();
  expect(state.replace).toHaveBeenCalledWith({
    pathname: "/login",
    query: { next: "/account/workspaces/invite?token=test-secret" },
  });
});
it("shows account recovery in Arabic without offering acceptance", () => {
  state.status = "verifyEmail";
  render(
    <NextIntlClientProvider locale="ar" messages={ar}>
      <InvitationPage token="test-secret" />
    </NextIntlClientProvider>,
  );
  expect(screen.getByRole("alert")).toHaveTextContent(ar.workspace.verifyEmail);
  expect(
    screen.getByRole("button", { name: ar.workspace.switchAccount }),
  ).toBeEnabled();
  expect(
    screen.queryByRole("button", { name: ar.workspace.accept }),
  ).not.toBeInTheDocument();
});

it("retains the invitation in memory through token failure and restores it only for explicit reload", async () => {
  state.authenticated = false;
  vi.spyOn(console, "error").mockImplementation(() => {
    /* React reports the intentionally injected boundary error. */
  });
  const storage = vi.spyOn(Storage.prototype, "setItem");
  render(invitation());
  expect(screen.getByRole("alert")).toHaveTextContent(en.common.error);
  expect(screen.queryByText("Test yard")).not.toBeInTheDocument();
  expect(screen.queryByText(en.common.loading)).not.toBeInTheDocument();
  expect(window.location.search).toBe("");
  await userEvent.click(screen.getByRole("button", { name: en.common.retry }));
  expect(new URL(window.location.href).searchParams.get("token")).toBe(
    "test-secret",
  );
  expect(state.reload).toHaveBeenCalledOnce();
  expect(storage).not.toHaveBeenCalled();
});

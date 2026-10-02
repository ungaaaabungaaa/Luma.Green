import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { beforeEach, describe, expect, it, vi } from "vitest";

import messages from "../../../messages/en.json";
import { AccountSecurity } from "./account-security";

const mocks = vi.hoisted(() => ({
  identity: vi.fn(),
  auth: vi.fn(),
  enable: vi.fn(),
  verifyTotp: vi.fn(),
  generateBackupCodes: vi.fn(),
  disable: vi.fn(),
  signOut: vi.fn(),
  revoke: vi.fn(),
  replace: vi.fn(),
}));
vi.mock("convex/react", () => ({
  useConvexAuth: mocks.auth,
  useQuery: mocks.identity,
}));
vi.mock("@/lib/auth-client", () => ({
  authClient: {
    useSession: () => ({ data: { session: { id: "fixture-session" } } }),
    twoFactor: mocks,
    signOut: mocks.signOut,
  },
}));
vi.mock("@/components/notifications/device-provider", () => ({
  lockDeviceSignOut: () => vi.fn(),
  revokeCurrentDevice: mocks.revoke,
}));
vi.mock("@/i18n/navigation", () => ({
  Link: "a",
  useRouter: () => ({ replace: mocks.replace }),
}));
vi.mock("qrcode", () => ({
  default: { toDataURL: () => Promise.resolve("") },
}));

beforeEach(() => {
  vi.resetAllMocks();
  mocks.auth.mockReturnValue({ isLoading: false, isAuthenticated: true });
  mocks.identity.mockReturnValue({ kind: "member", twoFactorEnabled: false });
  mocks.enable.mockResolvedValue({
    error: null,
    data: {
      totpURI: "otpauth://totp/Test?secret=TESTONLY",
      backupCodes: ["fixture-code"],
    },
  });
  mocks.verifyTotp.mockResolvedValue({
    error: null,
    data: { token: "fixture-session" },
  });
  mocks.signOut.mockResolvedValue({ error: null });
  mocks.revoke.mockResolvedValue(undefined);
});
function view() {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <AccountSecurity />
    </NextIntlClientProvider>,
  );
}

describe("account security", () => {
  it("allows phone-only household identities to enroll and only reveals recovery codes after verification", async () => {
    const user = userEvent.setup();
    view();
    expect(
      screen.getByText(messages.accountSecurity.disabled),
    ).toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: messages.accountSecurity.enable }),
    );
    expect(screen.queryByText("fixture-code")).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(messages.auth.codeLabel), {
      target: { value: "123456" },
    });
    await user.click(
      screen.getByRole("button", { name: messages.auth.verify }),
    );
    expect(screen.getByText("fixture-code")).toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: messages.accountSecurity.savedCodes }),
    );
    expect(screen.queryByText("fixture-code")).not.toBeInTheDocument();
  });

  it("handles recent-auth rejection and does not sign out until device revocation succeeds", async () => {
    const user = userEvent.setup();
    mocks.enable.mockResolvedValue({
      error: { code: "SECURITY_REAUTH_REQUIRED", status: 403 },
    });
    mocks.revoke.mockRejectedValueOnce(new Error("fixture offline"));
    view();
    await user.click(
      screen.getByRole("button", { name: messages.accountSecurity.enable }),
    );
    expect(screen.getByRole("alert")).toHaveTextContent(
      messages.accountSecurity.recentSignIn,
    );
    await user.click(
      screen.getByRole("button", {
        name: messages.accountSecurity.signInAgain,
      }),
    );
    expect(screen.getByRole("alert")).toHaveTextContent(messages.common.error);
    expect(mocks.signOut).not.toHaveBeenCalled();
    expect(mocks.replace).not.toHaveBeenCalled();
    await user.click(
      screen.getByRole("button", { name: messages.accountSecurity.enable }),
    );
    await user.click(
      screen.getByRole("button", {
        name: messages.accountSecurity.signInAgain,
      }),
    );
    expect(mocks.signOut).toHaveBeenCalledOnce();
    expect(mocks.replace).toHaveBeenCalledWith({
      pathname: "/login",
      query: { next: "/account/security" },
    });
  });

  it("requires a confirmation before disabling and surfaces a failed response", async () => {
    const user = userEvent.setup();
    mocks.identity.mockReturnValue({ kind: "member", twoFactorEnabled: true });
    mocks.disable.mockResolvedValue({ error: { status: 503 } });
    view();
    await user.click(
      screen.getByRole("button", { name: messages.accountSecurity.disable }),
    );
    expect(mocks.disable).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog")).toHaveTextContent(
      messages.accountSecurity.disableDescription,
    );
    const buttons = screen.getAllByRole("button", {
      name: messages.accountSecurity.disable,
    });
    const confirm = buttons.at(-1);
    if (!confirm) throw new Error("Missing confirmation");
    await user.click(confirm);
    expect(mocks.disable).toHaveBeenCalledOnce();
    expect(screen.getByRole("alert")).toHaveTextContent(messages.common.error);
  });

  it("does not leave an expired session on an endless skeleton", () => {
    mocks.auth.mockReturnValue({ isLoading: false, isAuthenticated: false });
    mocks.identity.mockReturnValue(undefined);
    view();
    expect(
      screen.getByRole("link", { name: messages.accountSecurity.signInAgain }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: messages.accountSecurity.enable }),
    ).not.toBeInTheDocument();
  });
});

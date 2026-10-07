import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { getFunctionName } from "convex/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AdminLogin } from "./admin-login";
import { AdminSetup } from "./admin-setup";
import { AuthenticatorStep } from "./authenticator-step";

const mocks = vi.hoisted(() => ({
  signIn: vi.fn(),
  signUp: vi.fn(),
  enable: vi.fn(),
  verify: vi.fn(),
  backup: vi.fn(),
  replace: vi.fn(),
  me: null as null | {
    kind: "admin";
    adminName: string;
    twoFactorEnabled: boolean;
  },
}));
vi.mock("@/components/providers/convex-provider", () => ({
  isConvexConfigured: true,
}));
vi.mock("@/components/notifications/device-provider", () => ({
  lockDeviceSignOut: () => vi.fn(),
  revokeCurrentDevice: vi.fn(),
}));
vi.mock("convex/react", () => ({
  useQuery: (query: Parameters<typeof getFunctionName>[0]) =>
    getFunctionName(query) === "identity:me" ? mocks.me : { adminSetup: true },
  useMutation: () => vi.fn(),
  useConvexAuth: () => ({ isAuthenticated: Boolean(mocks.me) }),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mocks.replace }),
}));
vi.mock("@/lib/auth-client", () => ({
  authClient: {
    useSession: () => ({
      data: {
        session: { id: "fixture-session" },
        user: { id: "fixture-user" },
      },
    }),
    signIn: { email: mocks.signIn },
    signUp: { email: mocks.signUp },
    twoFactor: {
      enable: mocks.enable,
      verifyTotp: mocks.verify,
      verifyBackupCode: mocks.backup,
    },
  },
}));
vi.mock("qrcode", () => ({
  default: { toDataURL: () => Promise.resolve("") },
}));

beforeEach(() => {
  vi.resetAllMocks();
  mocks.me = null;
});
async function passwordStep() {
  fireEvent.change(screen.getByLabelText("Email"), {
    target: { value: "admin@example.test" },
  });
  fireEvent.change(screen.getByLabelText("Password"), {
    target: { value: "example-only-password" },
  });
  await userEvent.click(screen.getByRole("button", { name: "Continue" }));
}

describe("admin request failures", () => {
  it("shows a safe password error on network failure and permits a second attempt", async () => {
    mocks.signIn.mockRejectedValueOnce(new Error("Private server failure"));
    mocks.signIn.mockResolvedValueOnce({
      data: { twoFactorRedirect: true },
      error: null,
    });
    render(<AdminLogin />);
    await passwordStep();
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Something went wrong. Try again.",
    );
    expect(screen.getByRole("button", { name: "Continue" })).toBeEnabled();
    await userEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect(
      await screen.findByLabelText("Code from your authenticator app"),
    ).toBeEnabled();
    expect(
      screen.queryByText("Private server failure"),
    ).not.toBeInTheDocument();
  });

  it.each(["totp", "backup"])(
    "releases %s controls after a rejected verification",
    async (mode) => {
      mocks.signIn.mockResolvedValue({
        data: { twoFactorRedirect: true },
        error: null,
      });
      mocks.verify.mockRejectedValueOnce(new Error("Offline"));
      mocks.backup.mockRejectedValueOnce(new Error("Offline"));
      render(<AdminLogin />);
      await passwordStep();
      if (mode === "backup") {
        await userEvent.click(
          screen.getByRole("button", { name: "Use a backup code" }),
        );
        fireEvent.change(screen.getByLabelText("Backup code"), {
          target: { value: "example-backup" },
        });
        await userEvent.click(
          screen.getByRole("button", { name: /^Sign in$/ }),
        );
      } else {
        fireEvent.change(
          screen.getByLabelText("Code from your authenticator app"),
          { target: { value: "123456" } },
        );
      }
      expect(await screen.findByRole("alert")).toHaveTextContent(
        "Something went wrong. Try again.",
      );
      expect(screen.getByRole("button", { name: "Start again" })).toBeEnabled();
      expect(
        screen.getByLabelText(
          mode === "backup"
            ? "Backup code"
            : "Code from your authenticator app",
        ),
      ).toBeEnabled();
      expect(mocks.replace).not.toHaveBeenCalled();
    },
  );

  it("does not leave enrolment locked after a rejected authenticator code", async () => {
    mocks.verify.mockRejectedValueOnce(new Error("Offline"));
    const onVerified = vi.fn();
    render(
      <AuthenticatorStep
        totpURI="otpauth://totp/Fixture"
        onVerified={onVerified}
      />,
    );
    fireEvent.change(screen.getByLabelText("Code from the app"), {
      target: { value: "123456" },
    });
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Something went wrong. Try again.",
    );
    expect(screen.getByLabelText("Code from the app")).toBeEnabled();
    expect(onVerified).not.toHaveBeenCalled();
  });

  it("sends the masked setup token only in the signup header and hides raw failures", async () => {
    mocks.signUp.mockRejectedValueOnce(new Error("Private server failure"));
    render(<AdminSetup />);
    const fields = {
      "Full name": "Fixture Admin",
      "Mobile number": "9000000000",
      "Date of birth": "1990-01-01",
      "Last four digits of your Aadhaar": "0000",
      "Setup token": "fixture-setup-token-at-least-32-characters",
      Email: "admin@example.test",
      Password: "example-only-password",
      "Password again": "example-only-password",
    };
    for (const [label, value] of Object.entries(fields))
      fireEvent.change(screen.getByLabelText(label), { target: { value } });
    expect(screen.getByLabelText("Setup token")).toHaveAttribute(
      "type",
      "password",
    );
    expect(screen.getByLabelText("Setup token")).toHaveAttribute(
      "autocomplete",
      "off",
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Create the admin account" }),
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Something went wrong. Try again.",
    );
    expect(mocks.signUp).toHaveBeenCalledExactlyOnceWith({
      name: "Fixture Admin",
      email: "admin@example.test",
      password: "example-only-password",
      fetchOptions: {
        headers: { "x-luma-admin-setup-token": fields["Setup token"] },
      },
    });
    expect(
      screen.getByRole("button", { name: "Create the admin account" }),
    ).toBeEnabled();
  });

  it("allows retry when resuming authenticator enrolment fails", async () => {
    mocks.me = {
      kind: "admin",
      adminName: "Fixture Admin",
      twoFactorEnabled: false,
    };
    mocks.enable.mockRejectedValueOnce(new Error("Private server failure"));
    render(<AdminSetup />);
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "example-only-password" },
    });
    await userEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Something went wrong. Try again.",
    );
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Continue" })).toBeEnabled();
    });
  });
});

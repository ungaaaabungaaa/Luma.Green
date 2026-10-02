import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, it, vi } from "vitest";

import { PasswordRecovery } from "./password-recovery";

const state = vi.hoisted(() => ({
  token: "",
  request: vi.fn(),
  reset: vi.fn(),
}));
vi.mock("next/navigation", () => ({
  useSearchParams: () =>
    new URLSearchParams(state.token ? { token: state.token } : {}),
}));
vi.mock("@/lib/auth-client", () => ({
  authClient: {
    requestPasswordReset: state.request,
    resetPassword: state.reset,
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
  state.token = "";
  state.request.mockResolvedValue({ error: null });
  state.reset.mockResolvedValue({ error: null });
  window.history.replaceState(null, "", "/admin/forgot-password");
});

function enterEmail() {
  fireEvent.change(screen.getByLabelText("Admin email"), {
    target: { value: "admin@example.test" },
  });
}
function enterPasswords(
  password = "Unique testing phrase 42",
  confirm = password,
) {
  fireEvent.change(screen.getByLabelText("New password"), {
    target: { value: password },
  });
  fireEvent.change(screen.getByLabelText("Password again"), {
    target: { value: confirm },
  });
}

it("returns a neutral recovery result without confirming an account exists", async () => {
  render(<PasswordRecovery />);
  enterEmail();
  await userEvent.click(
    screen.getByRole("button", { name: "Send reset link" }),
  );
  expect(state.request).toHaveBeenCalledWith({
    email: "admin@example.test",
    redirectTo: `${window.location.origin}/admin/reset-password`,
  });
  expect(screen.getByRole("status")).toHaveTextContent(
    "If this address belongs to the configured admin account",
  );
  expect(screen.queryByLabelText("Admin email")).not.toBeInTheDocument();
});

it.each([
  [{ code: "ADMIN_RECOVERY_UNAVAILABLE" }, "Email recovery is not configured"],
  [
    { code: "ADMIN_RECOVERY_DELIVERY_FAILED" },
    "could not confirm email delivery",
  ],
  [{ status: 429 }, "Too many attempts"],
])(
  "shows recovery failure %j without claiming that email was sent",
  async (error, message) => {
    state.request.mockResolvedValueOnce({ error });
    render(<PasswordRecovery />);
    enterEmail();
    await userEvent.click(
      screen.getByRole("button", { name: "Send reset link" }),
    );
    expect(screen.getByRole("alert")).toHaveTextContent(message);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Admin email")).toHaveValue(
      "admin@example.test",
    );
  },
);

it("retains email and allows retry after a network failure", async () => {
  state.request.mockRejectedValueOnce(new Error("offline"));
  render(<PasswordRecovery />);
  enterEmail();
  await userEvent.click(
    screen.getByRole("button", { name: "Send reset link" }),
  );
  expect(screen.getByRole("alert")).toHaveTextContent("Connection lost");
  await userEvent.click(
    screen.getByRole("button", { name: "Send reset link" }),
  );
  expect(state.request).toHaveBeenCalledTimes(2);
  expect(screen.getByRole("status")).toBeVisible();
});

it("keeps a missing-token reset unavailable and offers another link", () => {
  render(<PasswordRecovery reset />);
  expect(screen.getByRole("alert")).toHaveTextContent("missing its token");
  expect(
    screen.getByRole("button", { name: "Update password" }),
  ).toBeDisabled();
  expect(
    screen.getByRole("link", { name: "Request a new reset link" }),
  ).toHaveAttribute("href", "/admin/forgot-password");
  expect(state.reset).not.toHaveBeenCalled();
});

it("removes the token from the address bar and catches a confirmation mismatch", async () => {
  state.token = "synthetic-reset-token";
  window.history.replaceState(
    null,
    "",
    "/admin/reset-password?token=synthetic-reset-token",
  );
  render(<PasswordRecovery reset />);
  expect(window.location.search).toBe("");
  enterPasswords("Unique testing phrase 42", "Different testing phrase 42");
  await userEvent.click(
    screen.getByRole("button", { name: "Update password" }),
  );
  expect(screen.getByRole("alert")).toHaveTextContent("passwords do not match");
  expect(state.reset).not.toHaveBeenCalled();
});

it("shows an expired token error without clearing the form", async () => {
  state.token = "synthetic-reset-token";
  state.reset.mockResolvedValueOnce({ error: { code: "INVALID_TOKEN" } });
  render(<PasswordRecovery reset />);
  enterPasswords();
  await userEvent.click(
    screen.getByRole("button", { name: "Update password" }),
  );
  expect(screen.getByRole("alert")).toHaveTextContent("invalid or has expired");
  expect(screen.getByLabelText("New password")).toHaveValue(
    "Unique testing phrase 42",
  );
});

it("submits the in-memory token and confirms that the authenticator stays required", async () => {
  state.token = "synthetic-reset-token";
  render(<PasswordRecovery reset />);
  enterPasswords();
  await userEvent.click(
    screen.getByRole("button", { name: "Update password" }),
  );
  expect(state.reset).toHaveBeenCalledExactlyOnceWith({
    token: "synthetic-reset-token",
    newPassword: "Unique testing phrase 42",
  });
  expect(screen.getByRole("status")).toHaveTextContent(
    "previous sessions are signed out",
  );
  expect(screen.getByRole("status")).toHaveTextContent(
    "authenticator is still required",
  );
  expect(screen.queryByLabelText("New password")).not.toBeInTheDocument();
});

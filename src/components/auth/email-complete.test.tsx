import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { beforeEach, expect, it, vi } from "vitest";

import messages from "../../../messages/en.json";
import { EmailComplete } from "./email-complete";

const mocks = vi.hoisted(() => {
  const replace = vi.fn();
  return {
    auth: vi.fn(),
    reload: vi.fn(),
    ensure: vi.fn(),
    router: { replace },
    params: new URLSearchParams("next=/account/security"),
  };
});
vi.mock("@/lib/reload-current-page", () => ({
  reloadCurrentPage: mocks.reload,
}));
vi.mock("@/lib/auth-client", () => ({
  authClient: {
    useSession: () => ({
      data: { user: { id: "email-user" } },
      isPending: false,
      error: null,
    }),
  },
}));
vi.mock("convex/react", () => ({
  useConvexAuth: mocks.auth,
  useMutation: () => mocks.ensure,
}));
vi.mock("@/components/providers/convex-provider", () => ({
  isConvexConfigured: true,
}));
vi.mock("@/i18n/navigation", () => ({
  Link: "a",
  useRouter: () => mocks.router,
}));
vi.mock("next/navigation", () => ({ useSearchParams: () => mocks.params }));
beforeEach(() => {
  vi.resetAllMocks();
  mocks.auth.mockReturnValue({ isAuthenticated: true });
  mocks.params = new URLSearchParams("next=/account/security");
});
function view() {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <EmailComplete />
    </NextIntlClientProvider>,
  );
}
it("waits for a validated Convex session before creating a profile", () => {
  mocks.auth.mockReturnValue({ isAuthenticated: false, isLoading: true });
  view();
  expect(screen.getByRole("status")).toHaveTextContent(messages.common.loading);
  expect(mocks.ensure).not.toHaveBeenCalled();
  expect(mocks.router.replace).not.toHaveBeenCalled();
});
it("completes profile creation before navigating to the requested account page", async () => {
  mocks.ensure.mockResolvedValue("fixture-profile");
  view();
  await waitFor(() => {
    expect(mocks.router.replace).toHaveBeenCalledWith("/account/security");
  });
  expect(mocks.ensure).toHaveBeenCalledWith({ locale: "en" });
});
it("restarts the provider on manual retry after profile failure", async () => {
  mocks.params = new URLSearchParams("next=https://external.example");
  mocks.ensure
    .mockRejectedValueOnce(new Error("offline"))
    .mockResolvedValueOnce("fixture-profile");
  view();
  expect(await screen.findByRole("alert")).toHaveTextContent(
    messages.common.error,
  );
  expect(mocks.router.replace).not.toHaveBeenCalled();
  await userEvent.click(
    screen.getByRole("button", { name: messages.common.retry }),
  );
  expect(mocks.reload).toHaveBeenCalledOnce();
  expect(mocks.ensure).toHaveBeenCalledTimes(1);
});

it("rejects an external return path after profile creation", async () => {
  mocks.params = new URLSearchParams("next=https://external.example");
  mocks.ensure.mockResolvedValue("fixture-profile");
  view();
  await waitFor(() => {
    expect(mocks.router.replace).toHaveBeenCalledWith("/app");
  });
});

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { beforeEach, expect, it, vi } from "vitest";

import messages from "../../../messages/en.json";
import { PhoneForm } from "./phone-form";

const calls = vi.hoisted(() => ({
  sendOtp: vi.fn(),
  push: vi.fn(),
  rememberPhone: vi.fn(),
  rememberPreviewPhone: vi.fn(),
}));
vi.mock("@/lib/auth-client", () => ({
  authClient: { phoneNumber: { sendOtp: calls.sendOtp } },
}));
vi.mock("@/i18n/navigation", () => ({
  Link: "a",
  useRouter: () => ({ push: calls.push }),
}));
vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams("next=/app"),
}));
vi.mock("./storage", () => ({
  rememberPhone: calls.rememberPhone,
  rememberPreviewPhone: calls.rememberPreviewPhone,
}));
beforeEach(() => vi.resetAllMocks());

it("restores the send button after a network error and completes a retry", async () => {
  calls.sendOtp
    .mockRejectedValueOnce(new TypeError("offline"))
    .mockResolvedValueOnce({ error: null });
  render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <PhoneForm />
    </NextIntlClientProvider>,
  );
  await userEvent.type(
    screen.getByLabelText(messages.auth.mobileLabel),
    "9876543210",
  );
  await userEvent.click(
    screen.getByRole("button", { name: messages.auth.sendCode }),
  );
  expect(await screen.findByRole("alert")).toHaveTextContent(
    messages.auth.sendFailed,
  );
  const retry = screen.getByRole("button", { name: messages.auth.sendCode });
  expect(retry).toBeEnabled();
  expect(calls.push).not.toHaveBeenCalled();
  await userEvent.click(retry);
  expect(calls.rememberPhone).toHaveBeenCalledWith("+919876543210");
  expect(calls.push).toHaveBeenCalledWith({
    pathname: "/login/verify",
    query: { next: "/app" },
  });
});

it("previews the code screen without sending a code or exposing the number in the URL", async () => {
  render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <PhoneForm canSend={false} />
    </NextIntlClientProvider>,
  );
  expect(screen.queryByText(messages.auth.mobileHint)).not.toBeInTheDocument();
  expect(screen.getByLabelText(messages.auth.mobileLabel)).not.toHaveAttribute(
    "aria-describedby",
  );
  await userEvent.type(
    screen.getByLabelText(messages.auth.mobileLabel),
    "9876543210",
  );
  await userEvent.click(
    screen.getByRole("button", { name: messages.auth.previewAction }),
  );
  expect(calls.sendOtp).not.toHaveBeenCalled();
  expect(calls.rememberPhone).not.toHaveBeenCalled();
  expect(calls.rememberPreviewPhone).toHaveBeenCalledExactlyOnceWith(
    "+919876543210",
  );
  expect(calls.push).toHaveBeenCalledExactlyOnceWith({
    pathname: "/login/verify",
    query: { next: "/app" },
  });
});

it("validates a preview phone before leaving the form", async () => {
  render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <PhoneForm canSend={false} />
    </NextIntlClientProvider>,
  );
  await userEvent.type(screen.getByLabelText(messages.auth.mobileLabel), "123");
  await userEvent.click(
    screen.getByRole("button", { name: messages.auth.previewAction }),
  );
  expect(await screen.findByRole("alert")).toHaveTextContent(
    messages.auth.mobileInvalid,
  );
  expect(
    screen.getByLabelText(messages.auth.mobileLabel),
  ).toHaveAccessibleDescription(messages.auth.mobileInvalid);
  expect(screen.queryByText(messages.auth.mobileHint)).not.toBeInTheDocument();
  expect(calls.push).not.toHaveBeenCalled();
  expect(calls.sendOtp).not.toHaveBeenCalled();
  expect(calls.rememberPreviewPhone).not.toHaveBeenCalled();
});

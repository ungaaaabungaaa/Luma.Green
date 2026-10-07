import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { expect, it, vi } from "vitest";

import messages from "../../../messages/en.json";
import { LoginFlow } from "./login-flow";

vi.mock("@/components/providers/convex-provider", () => ({
  isConvexConfigured: false,
}));
vi.mock("./storage", () => ({
  isLanguageChosen: () => true,
  useStoredValue: () => true,
}));
vi.mock("./phone-form", () => ({ PhoneForm: () => <p>Phone form</p> }));
vi.mock("./email-form", () => ({ EmailForm: () => <p>Email form</p> }));
vi.mock("./language-choice", () => ({ LanguageChoice: () => null }));

it.each([
  ["en", "ltr"],
  ["ar", "rtl"],
  ["ur", "rtl"],
] as const)(
  "keeps %s sign-in tabs and their form in the locale direction",
  async (locale, direction) => {
    const user = userEvent.setup();
    render(
      <NextIntlClientProvider locale={locale} messages={messages}>
        <LoginFlow />
      </NextIntlClientProvider>,
    );
    const phone = screen.getByRole("tab", { name: messages.emailAuth.phone });
    expect(phone.closest("[dir]")).toHaveAttribute("dir", direction);
    phone.focus();
    await user.keyboard("{End}");
    const email = screen.getByRole("tab", { name: messages.emailAuth.email });
    expect(email).toHaveFocus();
    expect(email).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tabpanel").closest("[dir]")).toHaveAttribute(
      "dir",
      direction,
    );
    expect(screen.getByText("Email form")).toBeVisible();
  },
);

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, describe, expect, it, vi } from "vitest";

import messages from "../../../messages/en.json";
import { LanguageSwitcher } from "./language-switcher";

const replace = vi.hoisted(() => vi.fn());
vi.mock("@/i18n/navigation", () => ({
  usePathname: () => "/help",
  useRouter: () => ({ replace }),
}));

afterEach(() => {
  window.history.replaceState(null, "", "/");
  replace.mockReset();
});

describe("LanguageSwitcher", () => {
  it("shows the current language in its own script", () => {
    render(
      <NextIntlClientProvider locale="kn" messages={messages}>
        <LanguageSwitcher />
      </NextIntlClientProvider>,
    );
    expect(
      screen.getByRole("button", { name: "Language: ಕನ್ನಡ" }),
    ).toHaveTextContent("ಕನ್ನಡ");
  });

  it("keeps the query and anchor when the language changes", async () => {
    window.history.replaceState(
      null,
      "",
      "/help?role=yard&next=%2Fapp#contact",
    );
    render(
      <NextIntlClientProvider locale="en" messages={messages}>
        <LanguageSwitcher />
      </NextIntlClientProvider>,
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Language: English" }),
    );
    await userEvent.click(screen.getByRole("menuitemradio", { name: "தமிழ்" }));
    expect(replace).toHaveBeenCalledWith(
      "/help?role=yard&next=%2Fapp#contact",
      { locale: "ta" },
    );
  });

  it("keeps focus on the trigger when the menu is dismissed with Escape", async () => {
    render(
      <NextIntlClientProvider locale="en" messages={messages}>
        <LanguageSwitcher />
      </NextIntlClientProvider>,
    );
    const trigger = screen.getByRole("button", { name: "Language: English" });
    await userEvent.click(trigger);
    await userEvent.keyboard("{Escape}");
    expect(trigger).toHaveFocus();
    expect(replace).not.toHaveBeenCalled();
  });
});

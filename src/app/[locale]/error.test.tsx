import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { beforeEach, expect, it, vi } from "vitest";

import { reloadCurrentPage } from "@/lib/reload-current-page";

import ar from "../../../messages/ar.json";
import en from "../../../messages/en.json";
import kn from "../../../messages/kn.json";
import LocaleError from "./error";

vi.mock("@/lib/reload-current-page", () => ({ reloadCurrentPage: vi.fn() }));
beforeEach(() => vi.clearAllMocks());

it.each([
  { locale: "en", messages: en },
  { locale: "ar", messages: ar },
  { locale: "kn", messages: kn },
])(
  "offers explicit recovery in $locale without redirecting or showing private content",
  async ({ locale, messages }) => {
    render(
      <NextIntlClientProvider locale={locale} messages={messages}>
        <LocaleError />
      </NextIntlClientProvider>,
    );
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      messages.common.error,
    );
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(reloadCurrentPage).not.toHaveBeenCalled();
    await userEvent.click(
      screen.getByRole("button", { name: messages.common.retry }),
    );
    expect(reloadCurrentPage).toHaveBeenCalledOnce();
  },
);

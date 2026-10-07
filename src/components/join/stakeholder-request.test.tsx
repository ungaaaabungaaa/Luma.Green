import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { beforeEach, describe, expect, it, vi } from "vitest";

import messages from "../../../messages/en.json";
import { StakeholderRequest } from "./stakeholder-request";

const mocks = vi.hoisted(() => ({
  account: null as null | Record<string, unknown>,
  request: vi.fn(),
  replace: vi.fn(),
}));

vi.mock("convex/react", () => ({
  useConvexAuth: () => ({ isAuthenticated: true, isLoading: false }),
  useMutation: () => mocks.request,
}));
vi.mock("@/components/providers/use-signed-in-query", () => ({
  useSignedInQuery: () => mocks.account,
}));
vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ replace: mocks.replace }),
}));

function renderPage(locale = "en") {
  return render(
    <NextIntlClientProvider locale={locale} messages={messages}>
      <StakeholderRequest />
    </NextIntlClientProvider>,
  );
}

beforeEach(() => {
  mocks.account = null;
  mocks.request.mockReset().mockResolvedValue("new-request");
  mocks.replace.mockReset();
});

describe("stakeholder account request", () => {
  it.each(["ar", "ur"])(
    "keeps both %s selectors and keyboard options in the locale direction",
    async (locale) => {
      const user = userEvent.setup();
      renderPage(locale);
      const group = screen.getByRole("combobox", { name: "Account group" });
      expect(group).toHaveAttribute("dir", "rtl");
      group.focus();
      await user.keyboard("{Enter}");
      expect(screen.getByRole("listbox")).toHaveAttribute("dir", "rtl");
      await user.click(
        screen.getByRole("option", {
          name: "Non-household material generator",
        }),
      );
      const site = screen.getByRole("combobox", { name: "Primary site" });
      expect(site).toHaveAttribute("dir", "rtl");
      site.focus();
      await user.keyboard("{Enter}");
      expect(screen.getByRole("listbox")).toHaveAttribute("dir", "rtl");
      await user.keyboard("{Home}{Enter}");
      expect(site).toHaveTextContent("Apartment community");
      expect(site).toHaveFocus();
    },
  );

  it("requires group, site, organisation name and both consents", async () => {
    const user = userEvent.setup();
    renderPage();
    const submit = screen.getByRole("button", { name: "Send request" });
    expect(submit).toBeDisabled();

    screen.getByRole("combobox", { name: "Account group" }).focus();
    await user.keyboard("{Enter}");
    await user.click(
      screen.getByRole("option", {
        name: "Non-household material generator",
      }),
    );
    await user.type(
      screen.getByRole("textbox", { name: "Organisation name" }),
      "Lakeview Community",
    );
    await user.click(
      screen.getByRole("checkbox", {
        name: /18 or older/,
      }),
    );
    await user.click(
      screen.getByRole("checkbox", {
        name: /read what's collected/,
      }),
    );
    expect(submit).toBeDisabled();

    screen.getByRole("combobox", { name: "Primary site" }).focus();
    await user.keyboard("{Enter}");
    await user.click(
      screen.getByRole("option", { name: "Apartment community" }),
    );
    await user.click(submit);
    expect(mocks.request).toHaveBeenCalledWith({
      kind: "material_generator",
      siteType: "apartment_community",
      organizationName: "Lakeview Community",
      ageConfirmed: true,
      privacyAccepted: true,
    });
  });

  it("shows only the account status and the admin's rejection reason", () => {
    mocks.account = {
      kind: "lender",
      organizationName: "Community Credit",
      status: "rejected",
      reviewNote: "Could not confirm affiliation",
    };
    renderPage();
    expect(
      screen.getByRole("heading", { name: "We couldn't verify you" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Community Credit")).toBeInTheDocument();
    expect(
      screen.getByText("Could not confirm affiliation"),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Send request" }),
    ).not.toBeInTheDocument();
  });
});

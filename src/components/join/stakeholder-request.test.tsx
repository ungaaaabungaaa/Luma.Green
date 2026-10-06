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

function renderPage() {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
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

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useMutation } from "convex/react";
import { NextIntlClientProvider } from "next-intl";
import { beforeEach, describe, expect, it, vi } from "vitest";

import messages from "../../../messages/en.json";
import { SolarPlanner } from "./solar-planner";

vi.mock("@/components/providers/convex-provider", () => ({
  isConvexConfigured: true,
}));

vi.mock("convex/react", () => ({
  useConvexAuth: () => ({ isLoading: false, isAuthenticated: true }),
  useMutation: vi.fn(),
}));

function renderPlanner() {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <SolarPlanner />
    </NextIntlClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(useMutation).mockReturnValue(
    vi.fn() as unknown as ReturnType<typeof useMutation>,
  );
});

describe("SolarPlanner", () => {
  it("asks for usage before showing an estimate", () => {
    renderPlanner();

    expect(
      screen.getByText("Enter your bill or units to see your estimate."),
    ).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "My home" })).toBeChecked();
  });

  it("estimates a home from its bill, with the PM Surya Ghar subsidy", async () => {
    const user = userEvent.setup();
    renderPlanner();

    await user.type(
      screen.getByRole("textbox", { name: "Monthly electricity bill" }),
      "3,000",
    );

    expect(screen.getByText("3.5 kW")).toBeInTheDocument();
    expect(
      screen.getByText("Your bill is about 429 units a month."),
    ).toBeVisible();
    expect(screen.getByText("− ₹78,000")).toBeInTheDocument();
    expect(screen.getByText("₹1,14,500 – ₹1,49,500")).toBeInTheDocument();
    expect(screen.getByText("₹2,940 a month")).toBeInTheDocument();
    expect(screen.getByText("3.2–4.2 years")).toBeInTheDocument();
    expect(
      screen.getByRole("slider", { name: /Savings by year/ }),
    ).toHaveAttribute("aria-valuetext", "Year 10: ₹3,52,800 saved");
    expect(
      screen.getByText(
        "Estimates only, from the assumptions below. A site visit gives the real numbers.",
      ),
    ).toBeInTheDocument();
  });

  it("gives businesses no subsidy", async () => {
    const user = userEvent.setup();
    renderPlanner();

    await user.click(screen.getByRole("radio", { name: "My business" }));
    await user.type(
      screen.getByRole("textbox", { name: "Monthly electricity bill" }),
      "3000",
    );

    expect(screen.getByText("Not for businesses")).toBeInTheDocument();
    expect(screen.getByText("3 kW")).toBeInTheDocument();
  });

  it("carries the estimate into the message, until they edit it", async () => {
    const user = userEvent.setup();
    renderPlanner();
    const message = screen.getByRole("textbox", {
      name: "Anything we should know?",
    });
    expect(message).toHaveValue("");

    await user.type(
      screen.getByRole("textbox", { name: "Monthly electricity bill" }),
      "3000",
    );
    expect(message).toHaveValue(
      "For my home: a 3.5 kW system, from the estimate on this page.",
    );

    await user.type(message, " Roof is flat.");
    await user.click(screen.getByRole("radio", { name: "My business" }));
    expect(message).toHaveValue(
      "For my home: a 3.5 kW system, from the estimate on this page. Roof is flat.",
    );
  });

  it("flags a bill it can't use once they move on", async () => {
    const user = userEvent.setup();
    renderPlanner();
    const bill = screen.getByRole("textbox", {
      name: "Monthly electricity bill",
    });

    await user.type(bill, "50");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    await user.tab();

    expect(bill).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Enter a bill between ₹100 and ₹10,00,000.",
    );
  });

  it("starts fresh when they switch to units, and sizes to the roof", async () => {
    const user = userEvent.setup();
    renderPlanner();
    await user.type(
      screen.getByRole("textbox", { name: "Monthly electricity bill" }),
      "3000",
    );

    await user.click(screen.getByRole("radio", { name: "Units a month" }));
    const units = screen.getByRole("textbox", { name: "Units used a month" });
    expect(units).toHaveValue("");

    await user.type(units, "600");
    await user.click(screen.getByRole("radio", { name: "m²" }));
    await user.type(
      screen.getByRole("textbox", { name: /Shade-free roof space/ }),
      "32",
    );

    expect(screen.getByText("3 kW")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Sized to fit your roof. More roof space could cover more of your bill.",
      ),
    ).toBeInTheDocument();
  });

  it("says when the roof is too small for any system", async () => {
    const user = userEvent.setup();
    renderPlanner();
    await user.type(
      screen.getByRole("textbox", { name: "Monthly electricity bill" }),
      "2000",
    );
    await user.type(
      screen.getByRole("textbox", { name: /Shade-free roof space/ }),
      "50",
    );

    expect(screen.getByText("Your roof looks too small")).toBeInTheDocument();
    expect(
      screen.getByText(/needs about 108 sq ft of shade-free roof/),
    ).toBeInTheDocument();
  });
});

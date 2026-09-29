import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { aTrade, WithIntl } from "./test-utils";
import { TradeCard } from "./trade-card";

const { act, toast } = vi.hoisted(() => ({
  act: vi.fn(),
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("convex/react", () => ({ useMutation: () => act }));
vi.mock("sonner", () => ({ toast }));
vi.mock("@/i18n/navigation", () => ({
  Link: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children: ReactNode;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

beforeEach(() => {
  act.mockReset();
  toast.success.mockReset();
  toast.error.mockReset();
});

describe("TradeCard", () => {
  it("offers a new order to the seller as one tap", async () => {
    act.mockResolvedValue({ status: "accepted" });
    render(
      <WithIntl>
        <TradeCard
          trade={aTrade({ actions: ["accept", "decline"] })}
          side="seller"
        />
      </WithIntl>,
    );

    expect(
      screen.getByRole("heading", { name: "Newspaper · 100 kg" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "To Peenya Paper & Plastic Yard · Peenya Industrial Area",
      ),
    ).toBeInTheDocument();
    // The step it's waiting for is marked for screen readers too.
    const progress = screen.getByRole("list", { name: "Trade progress" });
    expect(progress.querySelector('[aria-current="step"]')).toHaveTextContent(
      "Accepted: next",
    );

    await userEvent.click(screen.getByRole("button", { name: "Accept order" }));
    expect(act).toHaveBeenCalledWith({ tradeId: "trade1", action: "accept" });
    expect(toast.success).toHaveBeenCalledWith("Order accepted");
  });

  it("asks before declining, since it can't be undone", async () => {
    act.mockResolvedValue({ status: "declined" });
    render(
      <WithIntl>
        <TradeCard
          trade={aTrade({ actions: ["accept", "decline"] })}
          side="seller"
        />
      </WithIntl>,
    );

    await userEvent.click(screen.getByRole("button", { name: "Decline" }));
    expect(act).not.toHaveBeenCalled();
    expect(screen.getByRole("alertdialog")).toHaveTextContent(
      "Decline this order from Peenya Paper & Plastic Yard?",
    );
    await userEvent.click(screen.getByRole("button", { name: "Yes, decline" }));
    expect(act).toHaveBeenCalledWith({ tradeId: "trade1", action: "decline" });
  });

  it("asks the buyer to pay the exact amount into escrow", () => {
    render(
      <WithIntl>
        <TradeCard
          trade={aTrade({
            status: "accepted",
            actions: ["pay"],
            counterparty: {
              name: "Ramesh Kabadi Store",
              area: "Yeshwanthpur",
              kind: "kabadiwala",
            },
          })}
          side="buyer"
        />
      </WithIntl>,
    );
    expect(
      screen.getByRole("button", { name: "Pay ₹1,750 into escrow" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("From Ramesh Kabadi Store · Yeshwanthpur"),
    ).toBeInTheDocument();
  });

  it("shows escrow, the e-way bill and the receipt on a big paid load", () => {
    render(
      <WithIntl>
        <TradeCard
          trade={aTrade({
            grams: 2_000_000,
            paisePerKg: 3800,
            totalPaise: 7_600_000,
            status: "paid_to_escrow",
            inEscrow: true,
            needsEwayBill: true,
            invoiceNo: "LG-26-0004",
            actions: ["dispatch"],
          })}
          side="seller"
        />
      </WithIntl>,
    );
    expect(screen.getByText("₹76,000 held in escrow")).toBeInTheDocument();
    expect(screen.getByText(/e-way bill must travel/)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Mark as dispatched" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Receipt LG-26-0004" }),
    ).toHaveAttribute("href", "/app/trades/trade1/invoice");
  });

  it("says what went wrong when a step fails", async () => {
    const { ConvexError } = await import("convex/values");
    act.mockRejectedValue(new ConvexError("NOT_ENOUGH_STOCK"));
    render(
      <WithIntl>
        <TradeCard
          trade={aTrade({
            status: "paid_to_escrow",
            inEscrow: true,
            actions: ["dispatch"],
          })}
          side="seller"
        />
      </WithIntl>,
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Mark as dispatched" }),
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "You don't have that much in stock.",
    );
    expect(toast.error).toHaveBeenCalled();
  });

  it("has nothing to press once it's done", () => {
    render(
      <WithIntl>
        <TradeCard trade={aTrade({ status: "completed" })} side="seller" />
      </WithIntl>,
    );
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(
      screen.getByText("Delivered. The money was released to you."),
    ).toBeInTheDocument();
  });
});

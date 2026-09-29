import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { getFunctionName } from "convex/server";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { InvoicePage } from "./invoice-page";
import { WithIntl } from "./test-utils";
import type { TradeReceipt } from "./types";

const { data } = vi.hoisted(() => ({
  data: { receipt: undefined as TradeReceipt | null | undefined },
}));

vi.mock("convex/react", () => ({
  useQuery: (query: Parameters<typeof getFunctionName>[0]) =>
    getFunctionName(query) === "workspace:mine"
      ? {
          kind: "org",
          org: { kind: "yard", name: "Peenya Paper & Plastic Yard" },
        }
      : data.receipt,
}));
vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children }: { href: string; children: ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

const PAID = Date.parse("2026-09-28T09:00:00Z");

function aReceipt(overrides: Partial<TradeReceipt> = {}): TradeReceipt {
  return {
    id: "trade1" as TradeReceipt["id"],
    number: "LG-26-0008",
    status: "paid_to_escrow",
    side: "buyer",
    issuedAt: PAID,
    releasedAt: null,
    seller: {
      name: "Ramesh Kabadi Store",
      kind: "kabadiwala",
      address: "12, 4th Cross, Yeshwanthpur, Bengaluru",
      gstin: undefined,
    },
    buyer: {
      name: "Peenya Paper & Plastic Yard",
      kind: "yard",
      address: "Plot 7, Peenya Industrial Area, Bengaluru",
      gstin: "29ABCPE1234F1Z5",
    },
    line: {
      material: {
        code: "PAPER-NEWS",
        names: { en: "Newspaper" },
        family: "paper",
      },
      grams: 400_000,
      paisePerKg: 17_500,
      paise: 7_000_000,
    },
    totalPaise: 7_000_000,
    inEscrow: true,
    needsEwayBill: true,
    ...overrides,
  };
}

beforeEach(() => {
  data.receipt = undefined;
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("InvoicePage", () => {
  it("prints both businesses, the line and the total", async () => {
    const print = vi.fn();
    vi.stubGlobal("print", print);
    data.receipt = aReceipt();
    render(
      <WithIntl>
        <InvoicePage id="trade1" />
      </WithIntl>,
    );

    expect(
      screen.getByRole("heading", { level: 1, name: "Trade receipt" }),
    ).toBeInTheDocument();
    expect(screen.getByText("LG-26-0008")).toBeInTheDocument();
    expect(screen.getByText("Ramesh Kabadi Store")).toBeInTheDocument();
    expect(screen.getByText("Not GST-registered")).toBeInTheDocument();
    expect(screen.getByText("GSTIN 29ABCPE1234F1Z5")).toBeInTheDocument();
    expect(screen.getByText("Newspaper")).toBeInTheDocument();
    expect(screen.getAllByText("₹70,000")).toHaveLength(2); // line and total
    expect(screen.getByText(/e-way bill must travel/)).toBeInTheDocument();
    expect(screen.getByText(/not a GST tax invoice/)).toBeInTheDocument();
    expect(
      screen.getByText("Held in escrow until the buyer confirms delivery."),
    ).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Print" }));
    expect(print).toHaveBeenCalled();
  });

  it("says when the money was released", () => {
    data.receipt = aReceipt({
      status: "completed",
      inEscrow: false,
      releasedAt: PAID + 24 * 60 * 60 * 1000,
    });
    render(
      <WithIntl>
        <InvoicePage id="trade1" />
      </WithIntl>,
    );
    expect(screen.getByText(/^Released to the seller on/)).toBeInTheDocument();
  });

  it("waits for payment before there's a receipt", () => {
    data.receipt = aReceipt({
      number: null,
      issuedAt: null,
      status: "accepted",
    });
    render(
      <WithIntl>
        <InvoicePage id="trade1" />
      </WithIntl>,
    );
    expect(screen.getByText("No receipt yet")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Back to trades" }),
    ).toHaveAttribute("href", "/app/trades");
  });

  it("finds nothing for someone else's trade or a bad link", () => {
    data.receipt = null;
    render(
      <WithIntl>
        <InvoicePage id="nope" />
      </WithIntl>,
    );
    expect(
      screen.getByRole("heading", { level: 1, name: "Receipt not found" }),
    ).toBeInTheDocument();
  });
});

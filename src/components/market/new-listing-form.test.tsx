import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { getFunctionName } from "convex/server";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { NewListingForm } from "./new-listing-form";
import { WithIntl } from "./test-utils";
import type { SellableItem } from "./types";

const { createListing, toast, data } = vi.hoisted(() => ({
  createListing: vi.fn(),
  toast: { success: vi.fn(), error: vi.fn() },
  data: { items: [] as unknown[] },
}));

vi.mock("convex/react", () => ({
  useConvexAuth: () => ({ isLoading: false, isAuthenticated: true }),
  useMutation: () => createListing,
  useQuery: (query: Parameters<typeof getFunctionName>[0]) =>
    getFunctionName(query) === "market:sellable"
      ? data.items
      : {
          city: "Bengaluru",
          date: "2026-10-02",
          rows: [
            { code: "PLASTIC-PET", todayPaise: 2000 },
            { code: "PAPER-NEWS", todayPaise: 1400 },
          ],
        },
}));
vi.mock("sonner", () => ({ toast }));
vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children }: { href: string; children: ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

function item(
  code: string,
  name: string,
  availableGrams: number,
): SellableItem {
  return {
    material: { code, names: { en: name }, family: "plastic" },
    stage: "scrap",
    stockGrams: availableGrams + 10_000,
    availableGrams,
  };
}

beforeEach(() => {
  createListing.mockReset();
  data.items = [
    item("PAPER-NEWS", "Newspaper", 0),
    item("PLASTIC-PET", "PET bottles", 42_000),
  ];
});

function renderForm() {
  render(
    <WithIntl>
      <NewListingForm sellerKind="kabadiwala" city="Bengaluru" />
    </WithIntl>,
  );
}

describe("NewListingForm", () => {
  it("offers only stock that's free to sell", () => {
    renderForm();
    expect(screen.getByRole("radio", { name: /Newspaper/ })).toBeDisabled();
    expect(screen.getByRole("radio", { name: /PET bottles/ })).toBeEnabled();
    expect(screen.getByText("42 kg free to sell")).toBeInTheDocument();
    expect(screen.getByText("All listed or sold")).toBeInTheDocument();
  });

  it("starts the price at today's market price, marked up for yards", async () => {
    renderForm();
    await userEvent.click(screen.getByRole("radio", { name: /PET bottles/ }));
    // ₹20 today × 1.25 for a kabadiwala selling to a yard.
    expect(screen.getByLabelText("Your price, ₹ per kg")).toHaveValue("25");
    expect(screen.getByText("Market today ₹20/kg")).toBeInTheDocument();
    expect(screen.getByText("Suggested ₹25/kg")).toBeInTheDocument();
  });

  it("won't list more than is free", async () => {
    renderForm();
    await userEvent.click(screen.getByRole("radio", { name: /PET bottles/ }));
    await userEvent.type(screen.getByLabelText("How many kg?"), "50");
    await userEvent.click(screen.getByRole("button", { name: "Put on sale" }));
    expect(
      await screen.findByText("You have 42 kg free to sell."),
    ).toBeInTheDocument();
    expect(createListing).not.toHaveBeenCalled();
  });

  it("sends grams and paise, and clears for the next lot", async () => {
    createListing.mockResolvedValue("listing1");
    renderForm();
    await userEvent.click(screen.getByRole("radio", { name: /PET bottles/ }));
    await userEvent.click(screen.getByRole("button", { name: "All 42 kg" }));
    await userEvent.clear(screen.getByLabelText("Your price, ₹ per kg"));
    await userEvent.type(screen.getByLabelText("Your price, ₹ per kg"), "24.5");
    await userEvent.click(screen.getByRole("button", { name: "Put on sale" }));
    expect(createListing).toHaveBeenCalledWith({
      materialCode: "PLASTIC-PET",
      grams: 42_000,
      askPaisePerKg: 2450,
      note: undefined,
    });
    expect(toast.success).toHaveBeenCalledWith(
      "On sale. Yards can see it now.",
    );
    expect(screen.getByLabelText("How many kg?")).toHaveValue("");
  });
});

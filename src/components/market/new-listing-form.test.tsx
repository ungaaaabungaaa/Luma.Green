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
  useQuery: (query: Parameters<typeof getFunctionName>[0]): unknown => {
    const name = getFunctionName(query);
    if (name === "market:sellable") return data.items;
    if (name === "market:listingLotOptions") return [];
    return {
      city: "Bengaluru",
      date: "2026-10-02",
      rows: [
        { code: "PLASTIC-PET", paisePerKg: 2000 },
        { code: "PAPER-NEWS", paisePerKg: 1400 },
      ],
    };
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

function renderForm(locale = "en") {
  render(
    <WithIntl locale={locale}>
      <NewListingForm sellerKind="kabadiwala" city="Bengaluru" />
    </WithIntl>,
  );
}

describe("NewListingForm", () => {
  it("includes a grade and specification only when the seller explicitly supplies them", async () => {
    renderForm();
    await userEvent.click(screen.getByRole("radio", { name: /PET bottles/ }));
    await userEvent.type(screen.getByLabelText("How many kg?"), "1");
    await userEvent.click(
      screen.getByRole("checkbox", { name: "Add a grade and specification" }),
    );
    await userEvent.click(screen.getByRole("button", { name: "Put on sale" }));
    expect(createListing).not.toHaveBeenCalled();
    await userEvent.type(screen.getByLabelText("Material grade"), "Clear PET");
    await userEvent.type(
      screen.getByLabelText("Buyer quality specification"),
      "Q1 buyer specification",
    );
    await userEvent.click(screen.getByRole("button", { name: "Put on sale" }));
    expect(createListing).toHaveBeenCalledWith(
      expect.objectContaining({
        specification: {
          grade: "Clear PET",
          specification: "Q1 buyer specification",
          lotId: undefined,
        },
      }),
    );
  });

  it("offers only stock that's free to sell", () => {
    renderForm();
    expect(screen.getByRole("radio", { name: /Newspaper/ })).toBeDisabled();
    expect(screen.getByRole("radio", { name: /PET bottles/ })).toBeEnabled();
    expect(screen.getByText("42 kg free to sell")).toBeInTheDocument();
    expect(screen.getByText("All listed or sold")).toBeInTheDocument();
  });

  it("starts the price at today's market price, marked up for preprocessors", async () => {
    renderForm();
    await userEvent.click(screen.getByRole("radio", { name: /PET bottles/ }));
    // ₹20 today × 1.25 for a kabadiwala selling to a preprocessor.
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
      "On sale. Preprocessors can see it now.",
    );
    expect(screen.getByLabelText("How many kg?")).toHaveValue("");
  });
});

it.each([
  ["en", "42", "90071992547409.91"],
  ["ar", "٤٢", "٩٠٠٧١٩٩٢٥٤٧٤٠٩٫٩١"],
  ["fr", "42", "90071992547409,91"],
])(
  "rejects a %s total outside exact money range without crashing the preview",
  async (locale, kg, price) => {
    renderForm(locale);
    await userEvent.click(screen.getByRole("radio", { name: /PET bottles/ }));
    await userEvent.type(screen.getByLabelText("How many kg?"), kg);
    await userEvent.clear(screen.getByLabelText("Your price, ₹ per kg"));
    await userEvent.type(screen.getByLabelText("Your price, ₹ per kg"), price);
    await userEvent.click(screen.getByRole("button", { name: "Put on sale" }));
    const errors = await screen.findAllByText(
      "This total is too large. Reduce the quantity or price.",
    );
    expect(errors[0]).toBeInTheDocument();
    expect(createListing).not.toHaveBeenCalled();
  },
);

vi.mock("@/components/workspace/permissions", () => ({
  useCanOperate: () => true,
}));

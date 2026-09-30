import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ConvexError } from "convex/values";
import { toast } from "sonner";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { PriceRow, type PriceRowData } from "./price-row";

const setPrices = vi.fn();

vi.mock("convex/react", () => ({
  useConvexAuth: () => ({ isLoading: false, isAuthenticated: true }),
  useMutation: () => setPrices,
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const newspaper: PriceRowData = {
  code: "PAPER-NEWS",
  family: "paper",
  stage: "scrap",
  names: { en: "Newspaper", hi: "अख़बार (रद्दी)" },
  floorPaise: 1200,
  fallbackPaise: 1400,
  updatedAt: Date.UTC(2026, 8, 28, 6),
  band: null,
  suggestedFallbackPaise: null,
  suggestedFloorPaise: null,
  suggestionOrgs: 0,
  boardStatus: null,
  boardTypicalPaise: null,
};

function setup(row: PriceRowData = newspaper) {
  const user = userEvent.setup();
  render(<PriceRow row={row} city="Bengaluru" />);
  return {
    user,
    minimum: screen.getByLabelText("Minimum ₹/kg for Newspaper"),
    fallback: screen.getByLabelText("Fallback ₹/kg for Newspaper"),
    save: screen.getByRole("button", { name: "Save" }),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("PriceRow", () => {
  it("shows the saved prices in rupees, with nothing to save yet", () => {
    const { minimum, fallback, save } = setup();
    expect(minimum).toHaveValue("12");
    expect(fallback).toHaveValue("14");
    expect(save).toBeDisabled();
  });

  it("explains a minimum above the fallback, and won't save it", async () => {
    const { user, minimum, save } = setup();
    await user.clear(minimum);
    await user.type(minimum, "15");
    expect(
      screen.getByText("The minimum can't be more than the fallback."),
    ).toBeInTheDocument();
    expect(minimum).toHaveAttribute("aria-invalid", "true");
    expect(save).toBeDisabled();
  });

  it("saves rupees as exact paise, and says which shop prices went up", async () => {
    setPrices.mockResolvedValue({ lifted: 3 });
    const { user, minimum, fallback, save } = setup();
    await user.clear(minimum);
    await user.type(minimum, "12.5");
    await user.clear(fallback);
    await user.type(fallback, "15");
    await user.click(save);

    expect(setPrices).toHaveBeenCalledWith({
      city: "Bengaluru",
      materialCode: "PAPER-NEWS",
      floorPaise: 1250,
      fallbackPaise: 1500,
    });
    expect(toast.success).toHaveBeenCalledWith(
      "Newspaper: minimum ₹12.50, fallback ₹15 a kilo.",
      {
        description:
          "3 shop prices were below the new minimum and have been raised to it.",
      },
    );
  });

  it("puts an edit back with Undo", async () => {
    const { user, minimum } = setup();
    await user.clear(minimum);
    await user.type(minimum, "13");
    await user.click(screen.getByRole("button", { name: "Undo" }));
    expect(minimum).toHaveValue("12");
    expect(
      screen.queryByRole("button", { name: "Undo" }),
    ).not.toBeInTheDocument();
  });

  it("tells the admin when the server refuses", async () => {
    setPrices.mockRejectedValue(new ConvexError("UNKNOWN_MATERIAL"));
    const { user, fallback, save } = setup();
    await user.clear(fallback);
    await user.type(fallback, "16");
    await user.click(save);
    expect(toast.error).toHaveBeenCalledWith(
      "This material isn't in the catalogue any more.",
    );
  });

  it("starts empty for a material with no price yet", () => {
    const { minimum, save } = setup({
      ...newspaper,
      floorPaise: null,
      fallbackPaise: null,
      updatedAt: null,
    });
    expect(minimum).toHaveValue("");
    expect(screen.getByText("Not set yet")).toBeInTheDocument();
    expect(save).toBeDisabled();
  });
});

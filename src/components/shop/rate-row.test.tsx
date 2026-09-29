import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useMutation } from "convex/react";
import { ConvexError } from "convex/values";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { priceProblem, RateRow } from "./rate-row";
import { NEWSPAPER, renderWithIntl } from "./test-helpers";
import type { RateCardRow } from "./types";

vi.mock("convex/react", () => ({
  useConvexAuth: () => ({ isLoading: false, isAuthenticated: true }),
  useMutation: vi.fn(),
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const setRate = vi.fn();

beforeEach(() => {
  setRate.mockReset();
  setRate.mockResolvedValue(null);
  vi.mocked(useMutation).mockReturnValue(
    setRate as unknown as ReturnType<typeof useMutation>,
  );
});

const NEWSPAPER_ROW: RateCardRow = {
  material: NEWSPAPER,
  myPaise: 1450,
  floorPaise: 1200,
  fallbackPaise: 1400,
  marketPaise: 1500,
  marketDate: "2026-09-29",
};

function renderRow(row: RateCardRow = NEWSPAPER_ROW) {
  renderWithIntl(
    <ul>
      <RateRow row={row} />
    </ul>,
  );
  return screen.getByRole("textbox", {
    name: "Your price for Newspaper, in rupees per kg",
  });
}

describe("priceProblem", () => {
  it("refuses what isn't a price, and anything under the floor", () => {
    expect(priceProblem("", 1200)).toBeNull();
    expect(priceProblem("abc", 1200)).toBe("invalid");
    expect(priceProblem("0", 1200)).toBe("invalid");
    expect(priceProblem("11.99", 1200)).toBe("belowFloor");
    expect(priceProblem("12", 1200)).toBeNull();
    expect(priceProblem("3", null)).toBeNull();
  });
});

describe("RateRow", () => {
  it("shows the price next to the minimum and today's market", () => {
    const input = renderRow();
    expect(input).toHaveValue("14.50");
    expect(screen.getByText("Minimum ₹12/kg")).toBeInTheDocument();
    expect(screen.getByText("Market ₹15/kg")).toBeInTheDocument();
    expect(screen.getByText("Below market")).toBeInTheDocument();
    // Nothing changed yet, so nothing to save.
    expect(
      screen.queryByRole("button", { name: "Save" }),
    ).not.toBeInTheDocument();
  });

  it("explains a price below the minimum and won't save it", async () => {
    const user = userEvent.setup();
    const input = renderRow();

    await user.clear(input);
    await user.type(input, "11");

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Too low. The minimum is ₹12/kg.",
    );
    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
    await user.keyboard("{Enter}");
    expect(setRate).not.toHaveBeenCalled();
  });

  it("saves a new price in paise", async () => {
    const user = userEvent.setup();
    const input = renderRow();

    await user.clear(input);
    await user.type(input, "15.5");
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(setRate).toHaveBeenCalledWith({
      materialCode: "PAPER-NEWS",
      paisePerKg: 1550,
    });
  });

  it("shows the floor when the server refuses the price", async () => {
    const user = userEvent.setup();
    setRate.mockRejectedValueOnce(new ConvexError("BELOW_FLOOR"));
    const input = renderRow({ ...NEWSPAPER_ROW, floorPaise: null });

    await user.clear(input);
    await user.type(input, "5");
    await user.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(
        "Too low. This is under the minimum price.",
      );
    });
  });

  it("tells the shop when households get the city price instead", () => {
    const input = renderRow({ ...NEWSPAPER_ROW, myPaise: null });
    expect(input).toHaveValue("");
    expect(input).toHaveAttribute("placeholder", "14");
    expect(
      screen.getByText("Not set yet. Households get the city price, ₹14/kg."),
    ).toBeInTheDocument();
  });
});

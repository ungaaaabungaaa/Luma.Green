import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useMutation } from "convex/react";
import { ConvexError } from "convex/values";
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import type { Id } from "../../../convex/_generated/dataModel";
import { IRON, NEWSPAPER, PET, renderWithIntl } from "./test-helpers";
import { WeighAndPay } from "./weigh-and-pay";

vi.mock("convex/react", () => ({
  useConvexAuth: () => ({ isLoading: false, isAuthenticated: true }),
  useMutation: vi.fn(),
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const complete = vi.fn();

beforeEach(() => {
  complete.mockReset();
  complete.mockResolvedValue({ totalPaise: 0, points: 0 });
  vi.mocked(useMutation).mockReturnValue(
    complete as unknown as ReturnType<typeof useMutation>,
  );
});

// Radix Select scrolls and captures the pointer, which jsdom can't do.
beforeAll(() => {
  Element.prototype.scrollIntoView = vi.fn();
  Element.prototype.hasPointerCapture = vi.fn(() => false);
  Element.prototype.releasePointerCapture = vi.fn();
});

afterAll(() => {
  const stubbed = Element.prototype as Partial<Element>;
  delete stubbed.scrollIntoView;
  delete stubbed.hasPointerCapture;
  delete stubbed.releasePointerCapture;
});

const BOOKING_ID = "booking-1" as Id<"bookings">;
const RATES = new Map([
  ["PAPER-NEWS", 1450],
  ["PLASTIC-PET", 2100],
  ["METAL-IRON", 2900],
]);

function renderScale() {
  renderWithIntl(
    <WeighAndPay
      bookingId={BOOKING_ID}
      items={[
        { material: NEWSPAPER, estKg: 12 },
        { material: PET, estKg: 3 },
      ]}
      rates={RATES}
      choices={[NEWSPAPER, PET, IRON]}
    />,
  );
}

const newspaperKg = () =>
  screen.getByRole("textbox", { name: "Newspaper, in kg" });

describe("WeighAndPay", () => {
  it("starts from the household's guess and totals at the shop's prices", () => {
    renderScale();
    expect(newspaperKg()).toHaveValue("12");
    expect(
      screen.getByRole("textbox", { name: "PET bottles, in kg" }),
    ).toHaveValue("3");
    // 12 kg × ₹14.50 + 3 kg × ₹21 = ₹174 + ₹63.
    expect(
      screen.getByRole("button", { name: "Confirm ₹237 paid" }),
    ).toBeInTheDocument();
  });

  it("updates the amount as the weight is typed or stepped", async () => {
    const user = userEvent.setup();
    renderScale();

    await user.clear(newspaperKg());
    await user.type(newspaperKg(), "10.5");
    // 10.5 kg × ₹14.50 = ₹152.25, plus ₹63.
    expect(
      screen.getByRole("button", { name: "Confirm ₹215.25 paid" }),
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: "Half a kilo more Newspaper" }),
    );
    expect(newspaperKg()).toHaveValue("11");
    await user.click(
      screen.getByRole("button", { name: "Half a kilo less Newspaper" }),
    );
    expect(newspaperKg()).toHaveValue("10.5");
  });

  it("records the weighed grams and how the household was paid", async () => {
    const user = userEvent.setup();
    renderScale();

    await user.clear(newspaperKg());
    await user.type(newspaperKg(), "11.25");
    await user.click(screen.getByRole("radio", { name: "UPI" }));
    await user.click(screen.getByRole("button", { name: /^Confirm/ }));

    expect(complete).toHaveBeenCalledWith({
      bookingId: BOOKING_ID,
      lines: [
        { materialCode: "PAPER-NEWS", grams: 11_250 },
        { materialCode: "PLASTIC-PET", grams: 3000 },
      ],
      method: "upi",
    });
  });

  it("adds a material the household didn't mention, ready to weigh", async () => {
    const user = userEvent.setup();
    renderScale();

    await user.click(
      screen.getByRole("combobox", { name: "Add another material" }),
    );
    await user.click(screen.getByRole("option", { name: "Iron and steel" }));

    const iron = screen.getByRole("textbox", { name: "Iron and steel, in kg" });
    expect(iron).toHaveFocus();
    await user.type(iron, "4");
    // ₹237 so far, plus 4 kg × ₹29.
    expect(
      screen.getByRole("button", { name: "Confirm ₹353 paid" }),
    ).toBeInTheDocument();
    // Everything the shop buys is on the scale now.
    expect(
      screen.queryByRole("combobox", { name: "Add another material" }),
    ).not.toBeInTheDocument();
  });

  it("leaves out materials weighed at zero, and needs at least one", async () => {
    const user = userEvent.setup();
    renderScale();

    await user.clear(newspaperKg());
    await user.click(
      screen.getByRole("button", { name: "Remove PET bottles" }),
    );
    await user.click(screen.getByRole("button", { name: /^Confirm/ }));

    expect(complete).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Weigh at least one material.",
    );
  });

  it("won't send a weight it can't read", async () => {
    const user = userEvent.setup();
    renderScale();

    await user.clear(newspaperKg());
    await user.type(newspaperKg(), "twelve");

    expect(newspaperKg()).toHaveAccessibleDescription(
      "Enter kilograms, like 12 or 12.5.",
    );
    await user.click(screen.getByRole("button", { name: /^Confirm/ }));
    expect(complete).not.toHaveBeenCalled();
  });

  it("says so when the request changed before the payment was saved", async () => {
    const user = userEvent.setup();
    complete.mockRejectedValueOnce(new ConvexError("WRONG_STATUS"));
    renderScale();

    await user.click(screen.getByRole("button", { name: /^Confirm/ }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(
        "This request changed in the meantime. Check it again.",
      );
    });
  });
});

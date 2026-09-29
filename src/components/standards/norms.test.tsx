import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import { EscrowSteps, ReceiptAnatomy, VerificationList } from "./norms";

vi.mock("next-intl/server", () => import("../site/intl-server.testing"));

async function renderAsync(element: Promise<ReactNode>) {
  return render(await element);
}

describe("the standard's norms", () => {
  it("lists what every receipt must show", async () => {
    await renderAsync(ReceiptAnatomy());

    expect(
      screen.getByRole("figure", { name: "What every receipt shows" }),
    ).toBeInTheDocument();
    expect(
      screen.getAllByRole("listitem").map((item) => item.textContent),
    ).toEqual([
      "Receipt number",
      "Date and time",
      "Seller",
      "Buyer",
      "Material code",
      "Weight, to the gram",
      "Rate per kg",
      "Total, and how it was paid",
    ]);
  });

  it("walks a business trade through escrow in order", async () => {
    await renderAsync(EscrowSteps());

    expect(
      screen.getAllByRole("listitem").map((item) => item.textContent),
    ).toEqual([
      "1The seller accepts the order",
      "2The buyer pays into escrow",
      "3The seller dispatches the goods",
      "4The buyer confirms, and the money is released",
    ]);
  });

  it("says who is checked for what", async () => {
    await renderAsync(VerificationList());

    expect(screen.getAllByRole("listitem")).toHaveLength(3);
    expect(screen.getByText(/pollution control board/)).toBeInTheDocument();
  });
});

import { render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";

import { PriceTables } from "./price-tables";

vi.mock("convex/react", () => ({
  useQuery: () => [],
  useMutation: () => vi.fn(),
}));

it("explains the missing catalogue without directing an operator to reset or seed data", () => {
  render(<PriceTables />);
  expect(screen.getByText("No materials yet")).toBeVisible();
  expect(
    screen.getByText(
      "Add the catalogue definitions below, then set approved prices. No sample rates or stock will be created.",
    ),
  ).toBeVisible();
  expect(
    screen.getByRole("button", { name: "Add catalogue definitions" }),
  ).toBeVisible();
  expect(screen.queryByText(/demo seed|reset/i)).not.toBeInTheDocument();
});

import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";

import messages from "../../../messages/en.json";
import { ListingCard } from "./listing-card";
import { aListing, WithIntl } from "./test-utils";

it("keeps a legacy listing visible when its total cannot be represented exactly", () => {
  render(
    <WithIntl>
      <ListingCard
        listing={aListing({ askPaisePerKg: Number.MAX_SAFE_INTEGER })}
      />
    </WithIntl>,
  );
  expect(
    screen.getByRole("heading", { name: "Newspaper" }),
  ).toBeInTheDocument();
  expect(screen.getByText(messages.market.totalInvalid)).toBeInTheDocument();
});

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import type { Id } from "../../../convex/_generated/dataModel";
import messages from "../../../messages/en.json";
import { ShopStep } from "./shop-step";
import type { ShopOffer } from "./types";

function withIntl(children: ReactNode) {
  return (
    <NextIntlClientProvider
      locale="en"
      messages={messages}
      timeZone="Asia/Kolkata"
      onError={(error) => {
        throw error;
      }}
    >
      {children}
    </NextIntlClientProvider>
  );
}

const shop = (id: string, overrides: Partial<ShopOffer>): ShopOffer => ({
  id: id as Id<"orgs">,
  name: id,
  area: "Yeshwanthpur",
  address: "12, 4th Cross, Yeshwanthpur, Bengaluru",
  offersPickup: true,
  hours: { opens: "08:00", closes: "20:00" },
  estimatePaise: 20_000,
  fallbackCodes: [],
  ...overrides,
});

const SHOPS = [
  shop("Ramesh Kabadi Store", { estimatePaise: 24_500, distanceKm: 0.4 }),
  shop("Jayanagar Raddi Centre", {
    offersPickup: false,
    estimatePaise: 30_000,
    distanceKm: 9.8,
  }),
  shop("HSR Waste Buyers", {
    estimatePaise: 23_000,
    distanceKm: 12.1,
    fallbackCodes: ["METAL-IRON"],
  }),
];

function renderShops(mode: "pickup" | "dropoff", shopId?: string) {
  const handlers = {
    onMode: vi.fn(),
    onShop: vi.fn(),
    onLocate: vi.fn(),
    onStopLocation: vi.fn(),
  };
  render(
    withIntl(
      <ShopStep
        mode={mode}
        shopId={shopId}
        shops={SHOPS}
        location={{ status: "on", point: { lat: 13.03, lng: 77.54 } }}
        {...handlers}
      />,
    ),
  );
  return handlers;
}

describe("ShopStep", () => {
  it("shows each shop's offer, and marks the best and the nearest", () => {
    renderShops("dropoff");
    const best = screen.getByRole("radio", { name: /Jayanagar Raddi Centre/ });
    expect(best).toBeEnabled();
    expect(screen.getByText("Best price")).toBeInTheDocument();
    expect(screen.getByText("Nearest")).toBeInTheDocument();
    expect(screen.getByText("₹300")).toBeInTheDocument();
    expect(screen.getByText("City price used for 1 item")).toBeInTheDocument();
  });

  it("won't take a pickup at a shop that doesn't pick up", () => {
    renderShops("pickup");
    expect(
      screen.getByRole("radio", { name: /Jayanagar Raddi Centre/ }),
    ).toBeDisabled();
    expect(
      screen.getByText(messages.sell.shop.noPickupHere),
    ).toBeInTheDocument();
    // The best offer among shops that can come is Ramesh's.
    expect(screen.getByText("Best price").closest("label")).toHaveTextContent(
      "Ramesh Kabadi Store",
    );
  });

  it("picks a shop and a way to hand it over", async () => {
    const { onShop, onMode } = renderShops("pickup");
    await userEvent.click(
      screen.getByRole("radio", { name: /HSR Waste Buyers/ }),
    );
    expect(onShop).toHaveBeenCalledWith("HSR Waste Buyers");
    await userEvent.click(
      screen.getByRole("radio", { name: /^I'll drop it off/ }),
    );
    expect(onMode).toHaveBeenCalledWith("dropoff");
  });

  it("offers to sort by price again after sharing the location", async () => {
    const { onStopLocation } = renderShops("pickup");
    expect(screen.getByText("Nearest shops first")).toBeInTheDocument();
    await userEvent.click(
      screen.getByRole("button", { name: "Sort by price instead" }),
    );
    expect(onStopLocation).toHaveBeenCalledOnce();
  });
});

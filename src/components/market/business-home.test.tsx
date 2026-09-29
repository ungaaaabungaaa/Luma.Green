import { render, screen, within } from "@testing-library/react";
import { getFunctionName } from "convex/server";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { BusinessHome } from "./business-home";
import { aListing, aTrade, WithIntl } from "./test-utils";
import type { ListingView, TradeView } from "./types";

const { data } = vi.hoisted(() => ({
  data: {
    kind: "yard",
    trades: { buying: [] as unknown[], selling: [] as unknown[] },
    offers: [] as unknown[],
    mine: [] as unknown[],
  },
}));

/** What each query returns, by function name. */
function queryResults(): Record<string, unknown> {
  return {
    "workspace:mine": {
      kind: "org",
      org: { kind: data.kind, name: "Peenya Paper & Plastic Yard" },
    },
    "market:trades": data.trades,
    "market:browse": data.offers,
    "market:myListings": data.mine,
    "catalogue:materials": [{ code: "RECYCLED-PET-FLAKE", stage: "recycled" }],
  };
}

vi.mock("convex/react", () => ({
  useConvexAuth: () => ({ isLoading: false, isAuthenticated: true }),
  useMutation: () => vi.fn(),
  useQuery: (query: Parameters<typeof getFunctionName>[0], args?: unknown) =>
    args === "skip" ? undefined : queryResults()[getFunctionName(query)],
}));
vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children }: { href: string; children: ReactNode }) => (
    <a href={href}>{children}</a>
  ),
  useRouter: () => ({ push: vi.fn() }),
}));

const now = Date.now();

beforeEach(() => {
  data.kind = "yard";
  data.trades = {
    buying: [
      aTrade({
        id: "pay-me" as TradeView["id"],
        status: "accepted",
        actions: ["pay"],
        totalPaise: 175_000,
      }),
    ],
    selling: [
      aTrade({
        id: "held" as TradeView["id"],
        status: "dispatched",
        inEscrow: true,
        totalPaise: 7_600_000,
      }),
      aTrade({
        id: "done" as TradeView["id"],
        status: "completed",
        totalPaise: 2_000_000,
        timeline: [{ status: "completed", at: now }],
      }),
    ],
  };
  data.offers = [aListing()];
  data.mine = [
    aListing({
      id: "open" as ListingView["id"],
      isMine: true,
      grams: 5_000_000,
    }),
    aListing({ id: "sold" as ListingView["id"], status: "sold", grams: 0 }),
  ];
});

function renderHome() {
  render(
    <WithIntl>
      <BusinessHome />
    </WithIntl>,
  );
}

describe("BusinessHome", () => {
  it("greets the business and adds up its trades", () => {
    renderHome();
    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Namaste, Peenya Paper & Plastic Yard",
      }),
    ).toBeInTheDocument();
    const stats = screen.getByRole("region", { name: "At a glance" });
    expect(within(stats).getByText("₹76,000")).toBeInTheDocument();
    expect(within(stats).getByText("1 trade needs a step")).toBeInTheDocument();
    expect(within(stats).getByText("5,000 kg listed")).toBeInTheDocument();
    expect(within(stats).getByText("₹20,000 traded")).toBeInTheDocument();
  });

  it("puts the step that's waiting one tap away", () => {
    renderHome();
    expect(
      screen.getByRole("button", { name: "Pay ₹1,750 into escrow" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Sell/ })).toHaveAttribute(
      "href",
      "/app/sell",
    );
  });

  it("shows manufacturers recycled material and no selling", () => {
    data.kind = "manufacturer";
    data.offers = [
      aListing({
        material: {
          code: "RECYCLED-PET-FLAKE",
          names: { en: "Recycled PET flakes" },
          family: "plastic",
        },
      }),
    ];
    renderHome();
    expect(
      screen.getByRole("heading", { name: "Recycled material for you" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Recycled lots")).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: /^Sell/ }),
    ).not.toBeInTheDocument();
  });
});

import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { getFunctionName } from "convex/server";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { MarketPage } from "./market-page";
import { aListing, WithIntl } from "./test-utils";
import type { ListingView } from "./types";

const { data } = vi.hoisted(() => ({
  data: {
    kind: "yard",
    listings: [] as unknown[],
  },
}));

/** What each query returns, by function name. */
function queryResults(): Record<string, unknown> {
  return {
    "workspace:mine": {
      kind: "org",
      org: { kind: data.kind, city: "Bengaluru" },
    },
    "catalogue:materials": [{ code: "RECYCLED-PET-FLAKE", stage: "recycled" }],
    "market:browse": data.listings,
  };
}

vi.mock("convex/react", () => ({
  useConvexAuth: () => ({ isLoading: false, isAuthenticated: true }),
  useMutation: () => vi.fn(),
  useQuery: (query: Parameters<typeof getFunctionName>[0]) =>
    queryResults()[getFunctionName(query)],
}));
vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children }: { href: string; children: ReactNode }) => (
    <a href={href}>{children}</a>
  ),
  useRouter: () => ({ push: vi.fn() }),
}));

function lot(id: string, code: string, name: string): ListingView {
  return aListing({
    id: id as ListingView["id"],
    material: { code, names: { en: name }, family: "paper" },
  });
}

beforeEach(() => {
  data.kind = "yard";
  data.listings = [
    lot("a", "PAPER-NEWS", "Newspaper"),
    lot("b", "METAL-IRON", "Iron and steel"),
    lot("c", "PAPER-NEWS", "Newspaper"),
  ];
});

function renderPage() {
  render(
    <WithIntl>
      <MarketPage />
    </WithIntl>,
  );
}

describe("MarketPage", () => {
  it("filters the lots by material", async () => {
    renderPage();
    expect(
      screen.getByRole("heading", { name: "3 lots on sale" }),
    ).toBeInTheDocument();
    const filter = screen.getByRole("group", { name: "Filter by material" });
    expect(within(filter).getByRole("button", { name: "All" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    await userEvent.click(
      within(filter).getByRole("button", { name: /Iron and steel/ }),
    );
    expect(
      screen.getByRole("heading", { name: "1 lot on sale" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 3, name: "Iron and steel" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { level: 3, name: "Newspaper" }),
    ).not.toBeInTheDocument();
  });

  it("marks recycled material for manufacturers and lists it first", () => {
    data.kind = "manufacturer";
    data.listings = [
      lot("a", "RECYCLED-HDPE-GRANULE", "Recycled HDPE granules"),
      lot("b", "RECYCLED-PET-FLAKE", "Recycled PET flakes"),
    ];
    renderPage();
    const [first] = screen.getAllByRole("heading", { level: 3 });
    expect(first).toHaveTextContent("Recycled PET flakes");
    expect(screen.getByText("Recycled")).toBeInTheDocument();
  });

  it("sends kabadiwalas to sell instead", () => {
    data.kind = "kabadiwala";
    renderPage();
    expect(
      screen.getByText("Kabadiwalas buy from households"),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Sell to yards" })).toHaveAttribute(
      "href",
      "/app/sell",
    );
  });

  it("says so when nothing is on sale", () => {
    data.listings = [];
    renderPage();
    expect(screen.getByText("Nothing on sale right now")).toBeInTheDocument();
  });
});

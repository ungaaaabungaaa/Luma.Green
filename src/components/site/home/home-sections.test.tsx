import { render, screen, within } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import messages from "../../../../messages/en.json";
import { ClosingCta } from "../closing-cta";
import { ChainDiagram } from "./chain-diagram";
import { HomeHero } from "./hero";
import { RoleBenefits } from "./role-benefits";
import { TrustPoints } from "./trust-points";
import { WhyNow } from "./why-now";

vi.mock("next-intl/server", () => import("../intl-server.testing"));

vi.mock("@/components/providers/convex-provider", () => ({
  isConvexConfigured: false,
}));

vi.mock("@/i18n/navigation", () => ({
  Link: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children: ReactNode;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

async function renderSection(section: Promise<ReactNode>) {
  const element = await section;
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      {element}
    </NextIntlClientProvider>,
  );
}

describe("home page", () => {
  it("leads with the promise and three ways in", async () => {
    await renderSection(HomeHero());

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "India's scrap chain, on one platform",
    );
    expect(
      screen.getByRole("link", { name: "Sell your scrap" }),
    ).toHaveAttribute("href", "/sell");
    expect(
      screen.getByRole("link", { name: "Join as a business" }),
    ).toHaveAttribute("href", "/join");
    expect(
      screen.getByRole("link", { name: "See today's prices" }),
    ).toHaveAttribute("href", "/prices");
    // Without Convex the price card still stands, and says why it's empty.
    expect(
      screen.getByText("Today's prices will show here soon."),
    ).toBeInTheDocument();
  });

  it("draws the chain in the order scrap moves, numbered", async () => {
    await renderSection(ChainDiagram());

    const chain = screen.getByRole("region", { name: "How scrap moves" });
    const steps = within(chain).getAllByRole("listitem");
    expect(
      steps.map((step) => within(step).getByRole("heading").textContent),
    ).toEqual([
      "Households",
      "Kabadiwalas",
      "Yards",
      "Recyclers",
      "Manufacturers",
    ]);
    expect(steps.at(-1)).toHaveTextContent("5");
    expect(
      within(chain).getByText(/Saathis help all along the chain/),
    ).toBeInTheDocument();
    expect(
      within(chain).getByText(/Escrow between businesses is planned/),
    ).toBeInTheDocument();
  });

  it("gives every role a way in: households sell, the rest join", async () => {
    await renderSection(RoleBenefits());

    const links = screen.getAllByRole("link");
    expect(links.map((link) => link.getAttribute("href"))).toEqual([
      "/sell",
      "/join/kabadiwala",
      "/join/yard",
      "/join/recycler",
      "/join/manufacturer",
      "/join/saathi",
    ]);
    expect(
      screen.getByRole("link", { name: "Join as a Saathi" }),
    ).toBeVisible();
  });

  it("counts the languages from the locale registry", async () => {
    await renderSection(TrustPoints());

    expect(
      screen.getByRole("heading", { name: "12 languages" }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("heading", { level: 3 })).toHaveLength(5);
  });

  it("explains why now without inventing numbers", async () => {
    await renderSection(WhyNow());

    const reasons = screen.getAllByRole("listitem");
    expect(reasons).toHaveLength(3);
    for (const reason of reasons) expect(reason).not.toHaveTextContent(/\d/);
  });

  it("closes with the same two ways in", async () => {
    await renderSection(ClosingCta());

    expect(
      screen.getByRole("link", { name: "Sell your scrap" }),
    ).toHaveAttribute("href", "/sell");
    expect(
      screen.getByRole("link", { name: "Join as a business" }),
    ).toHaveAttribute("href", "/join");
  });
});

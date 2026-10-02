import { render, screen, within } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import type { ComponentProps, ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import { findGuide } from "@/components/help/content";
import { TopicStories } from "@/components/help/topic-stories";
import { JoinPreparation } from "@/components/join/join-preparation";
import { PriceGuide } from "@/components/prices/price-guide";

import arabic from "../../../messages/ar.json";
import english from "../../../messages/en.json";
import tamil from "../../../messages/ta.json";
import { SortingGuide } from "./sorting-guide";

vi.mock("@/i18n/navigation", () => ({
  Link: (props: ComponentProps<"a">) => <a {...props} />,
}));

const catalogues = { en: english, ar: arabic, ta: tamil };

function show(content: ReactNode, locale: keyof typeof catalogues = "en") {
  return render(
    <NextIntlClientProvider
      locale={locale}
      messages={catalogues[locale]}
      onError={(error) => {
        throw error;
      }}
    >
      {content}
    </NextIntlClientProvider>,
  );
}

describe("public process detail", () => {
  it("explains separate preparation for paper, bottles, metal and e-waste", () => {
    show(<SortingGuide />);
    expect(
      screen.getByText(english.help.guides.getReady.steps.ewaste.body),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("term")).toHaveLength(4);
    expect(screen.getByRole("link")).toHaveAttribute(
      "href",
      "/help/household/get-ready",
    );
    expect(findGuide("household", "get-ready")).toBeDefined();
  });

  it("keeps the estimate-to-weight boundary beside the pricing explanation", () => {
    show(<PriceGuide />);
    expect(screen.getByText(english.sell.basket.weighNote)).toBeInTheDocument();
    expect(screen.getByText(english.prices.floorHelp)).toBeInTheDocument();
    expect(
      screen.getByText(english.help.guides.weighingAtDoor.steps.receipt.body),
    ).toBeInTheDocument();
    expect(screen.getByRole("link")).toHaveAttribute(
      "href",
      "/help/household/weighing-at-door",
    );
    expect(findGuide("household", "weighing-at-door")).toBeDefined();
  });

  it("explains the business review and privacy before document collection", () => {
    show(<JoinPreparation />);
    expect(
      screen.getByText(english.join.status.checks.business.two),
    ).toBeInTheDocument();
    expect(screen.getByText(english.join.consent.privacy)).toBeInTheDocument();
    expect(screen.getByRole("link")).toHaveAttribute(
      "href",
      "/help/yard/verify-business",
    );
    expect(findGuide("yard", "verify-business")).toBeDefined();
  });

  it("links each illustrated help topic to a maintained full guide", () => {
    show(<TopicStories />);
    const topics = screen.getByRole("region", {
      name: english.help.topicsHeading,
    });
    expect(
      within(topics)
        .getAllByRole("link")
        .map((link) => link.getAttribute("href")),
    ).toEqual([
      "/help/household/get-ready",
      "/help/household/weighing-at-door",
      "/help/yard/verify-business",
    ]);
    expect(within(topics).getAllByRole("heading", { level: 3 })).toHaveLength(
      3,
    );
  });

  for (const locale of ["ar", "ta"] as const) {
    it(`resolves the full process detail and guide actions in ${locale}`, () => {
      const messages = catalogues[locale];
      show(
        <>
          <SortingGuide />
          <PriceGuide />
          <JoinPreparation />
          <TopicStories />
        </>,
        locale,
      );
      expect(
        screen.getByRole("region", {
          name: messages.help.guides.getReady.title,
        }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("region", {
          name: messages.join.status.submitted.whatWeCheck,
        }),
      ).toBeInTheDocument();
      expect(
        screen.getByText(messages.sell.basket.weighNote),
      ).toBeInTheDocument();
      expect(
        screen.queryByText(english.help.guides.getReady.steps.ewaste.body),
      ).not.toBeInTheDocument();
      expect(screen.getAllByRole("link")).toHaveLength(6);
    });
  }
});

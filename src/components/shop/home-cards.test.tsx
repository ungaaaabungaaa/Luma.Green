import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import type { ComponentProps } from "react";
import { describe, expect, it, vi } from "vitest";

import tamil from "../../../messages/ta.json";
import { NewRequestsCard, TodayCard } from "./home-cards";

vi.mock("@/i18n/navigation", () => ({
  Link: ({
    href,
    ...props
  }: Omit<ComponentProps<"a">, "href"> & {
    href: string | { pathname: string; query: Record<string, string> };
  }) => (
    <a
      {...props}
      href={
        typeof href === "string"
          ? href
          : `${href.pathname}?${new URLSearchParams(href.query).toString()}`
      }
    />
  ),
}));

describe("short shop actions", () => {
  it("includes the visible Tamil label and full action in the accessible name", () => {
    render(
      <NextIntlClientProvider
        locale="ta"
        messages={tamil}
        timeZone="Asia/Kolkata"
      >
        <NewRequestsCard count={1} />
        <TodayCard active={[]} today="2026-10-14" city="Bengaluru" />
      </NextIntlClientProvider>,
    );
    for (const [visible, full] of [
      [tamil.app.nav.requests, tamil.shop.home.seeRequests],
      [tamil.shop.days.today, tamil.shop.home.seeToday],
    ]) {
      const action = screen.getByRole("link", { name: `${visible}: ${full}` });
      expect(action).toHaveTextContent(visible);
    }
  });
});

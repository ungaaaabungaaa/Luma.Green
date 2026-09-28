import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import messages from "../../../messages/en.json";
import { SiteNav } from "./site-nav";

const pathname = vi.hoisted(() => ({ current: "/" }));

vi.mock("@/i18n/navigation", () => ({
  usePathname: () => pathname.current,
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

function renderNav() {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <SiteNav />
    </NextIntlClientProvider>,
  );
}

describe("SiteNav", () => {
  beforeEach(() => {
    pathname.current = "/";
  });

  it("is a named navigation landmark with every public page", () => {
    renderNav();

    const nav = screen.getByRole("navigation", { name: "Main" });
    expect(nav).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "How it works" })).toHaveAttribute(
      "href",
      "/how-it-works",
    );
    expect(screen.getByRole("link", { name: "Who it's for" })).toBeVisible();
    expect(screen.getByRole("link", { name: "Contact" })).toBeVisible();
  });

  it("marks only the current page for assistive tech", () => {
    pathname.current = "/contact";
    renderNav();

    expect(screen.getByRole("link", { name: "Contact" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(
      screen.getByRole("link", { name: "How it works" }),
    ).not.toHaveAttribute("aria-current");
  });
});

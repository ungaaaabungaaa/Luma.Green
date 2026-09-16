import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { site } from "@/lib/site";

import { Logo, LogoMark } from "./logo";

describe("LogoMark", () => {
  it("exposes the brand name to assistive tech", () => {
    render(<LogoMark />);
    expect(screen.getByRole("img", { name: site.name })).toBeInTheDocument();
  });

  it("accepts a size override without dropping the default classes", () => {
    render(<LogoMark className="size-20" data-testid="mark" />);
    expect(screen.getByTestId("mark")).toHaveClass("size-20");
  });
});

describe("Logo", () => {
  it("renders the wordmark next to the mark", () => {
    render(<Logo />);
    expect(screen.getByText(site.name)).toBeInTheDocument();
    expect(screen.getByRole("img", { name: site.name })).toBeInTheDocument();
  });
});

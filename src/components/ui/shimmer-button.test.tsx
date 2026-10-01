import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";

import { ShimmerButton } from "./shimmer-button";

it("keeps an asChild call to action as one accessible link", () => {
  render(
    <ShimmerButton asChild>
      <a href="https://example.com/sell">Sell scrap</a>
    </ShimmerButton>,
  );
  expect(screen.getByRole("link", { name: "Sell scrap" })).toHaveAttribute(
    "href",
    "https://example.com/sell",
  );
  expect(screen.queryByRole("button")).not.toBeInTheDocument();
});

it("keeps button activation and disabled semantics", async () => {
  const click = vi.fn();
  const user = userEvent.setup();
  const { rerender } = render(
    <ShimmerButton onClick={click}>Continue</ShimmerButton>,
  );
  await user.click(screen.getByRole("button", { name: "Continue" }));
  expect(click).toHaveBeenCalledTimes(1);
  rerender(
    <ShimmerButton disabled onClick={click}>
      Continue
    </ShimmerButton>,
  );
  await user.click(screen.getByRole("button", { name: "Continue" }));
  expect(click).toHaveBeenCalledTimes(1);
});

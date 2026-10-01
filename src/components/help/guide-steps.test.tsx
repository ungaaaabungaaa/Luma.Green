import { render, screen, within } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it } from "vitest";

import messages from "../../../messages/en.json";
import { guidesFor } from "./content";
import { GuideSteps } from "./guide-steps";

describe("guide instructions", () => {
  it("keeps each step heading and its instructions in an ordered list", () => {
    const guide = guidesFor("household")[0];
    expect(guide).toBeDefined();
    render(
      <NextIntlClientProvider locale="en" messages={messages}>
        <GuideSteps guide={guide} />
      </NextIntlClientProvider>,
    );
    const steps = screen.getAllByRole("listitem");
    expect(steps).toHaveLength(guide.steps.length);
    for (const [index, step] of steps.entries()) {
      expect(within(step).getByRole("heading", { level: 3 })).toBeVisible();
      expect(step).toHaveTextContent(
        `Step ${String(index + 1)} of ${String(guide.steps.length)}`,
      );
    }
  });
});

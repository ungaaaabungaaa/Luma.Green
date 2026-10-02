import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it, vi } from "vitest";

import { FieldSet, YesNo } from "@/components/join/fields";
import { ChoiceGroup } from "@/components/solar/choice-group";

import messages from "../../../messages/en.json";
import { EMPTY_DRAFT } from "./draft";
import { ModeChoice } from "./mode-choice";
import { WhenStep } from "./when-step";

describe.each(["ar", "ur"])("selection direction in %s", (locale) => {
  it("moves to the next handover choice with the left arrow", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <NextIntlClientProvider locale={locale} messages={messages}>
        <ModeChoice mode="pickup" onChange={onChange} />
      </NextIntlClientProvider>,
    );
    expect(screen.getByRole("radiogroup")).toHaveAttribute("dir", "rtl");
    await user.tab();
    await user.keyboard("{ArrowLeft>}");
    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith("dropoff");
    });
    await user.keyboard("{/ArrowLeft}");
  });

  it("keeps both date and time choices in reading order", () => {
    render(
      <NextIntlClientProvider
        locale={locale}
        messages={messages}
        timeZone="Asia/Kolkata"
      >
        <WhenStep
          draft={EMPTY_DRAFT}
          shop={undefined}
          today="2026-10-14"
          now={Date.parse("2026-10-14T06:00:00Z")}
          problems={[]}
          onChange={vi.fn()}
        />
      </NextIntlClientProvider>,
    );
    expect(screen.getAllByRole("radiogroup")).toHaveLength(2);
    for (const group of screen.getAllByRole("radiogroup")) {
      expect(group).toHaveAttribute("dir", "rtl");
    }
  });

  it("applies the locale direction to onboarding and solar choices", () => {
    render(
      <NextIntlClientProvider locale={locale} messages={messages}>
        <FieldSet id="gst" legend="GST registration">
          <YesNo name="gst" isYes={undefined} onChange={vi.fn()} />
        </FieldSet>
        <h3 id="usage-mode">Usage mode</h3>
        <ChoiceGroup
          name="usage"
          labelledBy="usage-mode"
          value="bill"
          options={[
            { value: "bill", label: "Bill" },
            { value: "units", label: "Units" },
          ]}
          onChange={vi.fn()}
          compact
        />
      </NextIntlClientProvider>,
    );
    for (const group of screen.getAllByRole("radiogroup")) {
      expect(group).toHaveAttribute("dir", "rtl");
    }
  });
});

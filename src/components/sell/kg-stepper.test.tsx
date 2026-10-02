import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import messages from "../../../messages/en.json";
import { KgStepper } from "./kg-stepper";

function withIntl(children: ReactNode) {
  return (
    <NextIntlClientProvider
      locale="en"
      messages={messages}
      timeZone="Asia/Kolkata"
      onError={(error) => {
        throw error;
      }}
    >
      {children}
    </NextIntlClientProvider>
  );
}

function renderStepper(kg: number) {
  const onChange = vi.fn();
  const onRemove = vi.fn();
  render(
    withIntl(
      <KgStepper
        material="Newspaper"
        kg={kg}
        onChange={onChange}
        onRemove={onRemove}
      />,
    ),
  );
  return { onChange, onRemove };
}

describe("KgStepper", () => {
  it("steps the kilos up and down", async () => {
    const { onChange } = renderStepper(5);
    await userEvent.click(
      screen.getByRole("button", { name: "More Newspaper" }),
    );
    expect(onChange).toHaveBeenLastCalledWith(6);
    await userEvent.click(
      screen.getByRole("button", { name: "Less Newspaper" }),
    );
    expect(onChange).toHaveBeenLastCalledWith(4);
  });

  it("turns − into remove at the smallest amount", async () => {
    const { onChange, onRemove } = renderStepper(0.5);
    expect(
      screen.queryByRole("button", { name: "Less Newspaper" }),
    ).not.toBeInTheDocument();
    await userEvent.click(
      screen.getByRole("button", { name: "Remove Newspaper" }),
    );
    expect(onRemove).toHaveBeenCalledOnce();
    expect(onChange).not.toHaveBeenCalled();
  });

  it("sets a quick amount in one tap and shows which one is on", async () => {
    const { onChange } = renderStepper(10);
    const presets = screen.getByRole("group", {
      name: "Quick amounts for Newspaper",
    });
    expect(presets).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "10 kg" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await userEvent.click(screen.getByRole("button", { name: "25 kg" }));
    expect(onChange).toHaveBeenLastCalledWith(25);
  });

  it("takes typed kilos when they leave the box", async () => {
    const { onChange } = renderStepper(5);
    const box = screen.getByRole("textbox", { name: "Kilos of Newspaper" });
    await userEvent.clear(box);
    await userEvent.type(box, "12,5{Enter}");
    expect(onChange).toHaveBeenLastCalledWith(12.5);
  });

  it("keeps quick amounts selectable from the keyboard", async () => {
    const { onChange } = renderStepper(10);
    screen.getByRole("button", { name: "25 kg" }).focus();
    await userEvent.keyboard(" ");
    expect(onChange).toHaveBeenLastCalledWith(25);
  });

  it("ignores typing that isn't a number", async () => {
    const { onChange } = renderStepper(5);
    const box = screen.getByRole("textbox", { name: "Kilos of Newspaper" });
    await userEvent.clear(box);
    await userEvent.type(box, "lots");
    await userEvent.tab();
    expect(onChange).not.toHaveBeenCalled();
    expect(box).toHaveValue("5");
  });
});

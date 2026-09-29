import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, describe, expect, it } from "vitest";

import messages from "../../../messages/en.json";
import { openDetailsForHash } from "./faq-hash-opener";
import { FaqList } from "./faq-list";

function renderList() {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <FaqList faqs={["noCode", "canCancel"]} />
    </NextIntlClientProvider>,
  );
}

function question(name: string) {
  const summary = screen.getByText(name).closest("summary");
  const details = summary?.parentElement;
  if (!(details instanceof HTMLDetailsElement)) {
    throw new TypeError(`No question "${name}"`);
  }
  return details;
}

describe("FaqList", () => {
  afterEach(() => {
    window.location.hash = "";
  });

  it("shows questions closed, and opens one on a tap", async () => {
    const user = userEvent.setup();
    renderList();
    const cancel = question("Can I cancel?");
    expect(cancel).not.toHaveAttribute("open");

    await user.click(screen.getByText("Can I cancel?"));
    expect(cancel).toHaveAttribute("open");
    expect(
      screen.getByText(/Open your tracking link and tap Cancel/),
    ).toBeVisible();
  });

  it("opens the question a link points at", () => {
    window.location.hash = "#faq-can-cancel";
    renderList();
    expect(question("Can I cancel?")).toHaveAttribute("open");
    expect(question("I didn't get the SMS code")).not.toHaveAttribute("open");
  });
});

describe("openDetailsForHash", () => {
  it("ignores empty, unknown and malformed fragments", () => {
    renderList();
    for (const hash of ["", "#", "#faq-nothing", "#%E0%A4%A", "#a[b"]) {
      openDetailsForHash(hash);
    }
    expect(question("Can I cancel?")).not.toHaveAttribute("open");
    expect(question("I didn't get the SMS code")).not.toHaveAttribute("open");
  });
});

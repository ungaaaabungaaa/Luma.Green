import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import messages from "../../../messages/en.json";
import type { HelpRole } from "./content";
import { TrainingPath } from "./training-path";

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

const household: HelpRole = "household";

function renderPath() {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <TrainingPath role={household} />
    </NextIntlClientProvider>,
  );
}

describe("TrainingPath", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("lists every lesson with a way to mark it done", () => {
    renderPath();
    expect(
      screen.getByRole("heading", { name: "What can be recycled" }),
    ).toBeInTheDocument();
    expect(
      screen.getAllByRole("checkbox", { name: "Mark as done" }),
    ).toHaveLength(4);
    expect(screen.getByText("0 of 4 done")).toBeInTheDocument();
    expect(
      screen.getAllByRole("link", { name: "Open the guide" })[0],
    ).toHaveAttribute("href", "/help/household/get-ready");
  });

  it("counts lessons as they're done and awards a badge at the end", async () => {
    const user = userEvent.setup();
    renderPath();
    const boxes = screen.getAllByRole("checkbox", { name: "Mark as done" });

    await user.click(boxes[0]);
    expect(screen.getByText("1 of 4 done")).toBeInTheDocument();
    expect(boxes[0]).toBeChecked();
    expect(screen.queryByText("Training complete")).not.toBeInTheDocument();

    for (const box of boxes.slice(1)) await user.click(box);
    expect(screen.getByText("4 of 4 done")).toBeInTheDocument();
    expect(screen.getByText("Training complete")).toBeInTheDocument();
  });

  it("starts again from zero", async () => {
    const user = userEvent.setup();
    renderPath();
    await user.click(
      screen.getAllByRole("checkbox", { name: "Mark as done" })[1],
    );
    await user.click(screen.getByRole("button", { name: "Start again" }));
    expect(screen.getByText("0 of 4 done")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Start again" }),
    ).not.toBeInTheDocument();
  });

  it("picks up where the learner left off", () => {
    window.localStorage.setItem(
      "luma.help.training.household",
      JSON.stringify([
        "whatRecycles",
        "sortOnce",
        "batteriesSafe",
        "fairWeigh",
      ]),
    );
    renderPath();
    expect(screen.getByText("4 of 4 done")).toBeInTheDocument();
    expect(screen.getByText("Training complete")).toBeInTheDocument();
  });
});

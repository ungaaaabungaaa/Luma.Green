import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ConvexError } from "convex/values";
import { NextIntlClientProvider } from "next-intl";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import messages from "../../../messages/en.json";
import { ContactMessageForm } from "./contact-form";

const send = vi.hoisted(() => vi.fn());
const search = vi.hoisted(() => ({ current: "" }));

vi.mock("convex/react", () => ({
  useMutation: () => send,
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(search.current),
}));

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

function renderForm() {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <ContactMessageForm />
    </NextIntlClientProvider>,
  );
}

async function fillIn(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText("Your name"), "  Ramesh Kumar ");
  await user.type(screen.getByLabelText("Mobile number"), "98765 43210");
  await user.type(
    screen.getByLabelText("Your message"),
    "The yard has not collected my load.",
  );
}

describe("ContactMessageForm", () => {
  beforeEach(() => {
    send.mockReset();
    search.current = "role=kabadiwala&topic=trade";
  });

  it("starts with who and what already chosen when the link says so", () => {
    renderForm();
    expect(screen.getByRole("combobox", { name: "You are" })).toHaveTextContent(
      "A kabadiwala",
    );
    expect(
      screen.getByRole("combobox", { name: "What is it about?" }),
    ).toHaveTextContent("A trade between businesses");
  });

  it("ignores a role or topic it doesn't know", () => {
    search.current = "role=admin&topic=bitcoin";
    renderForm();
    expect(screen.getByRole("combobox", { name: "You are" })).toHaveTextContent(
      "Choose one",
    );
  });

  it("says what's missing and sends nothing", async () => {
    search.current = "";
    const user = userEvent.setup();
    renderForm();
    await user.type(screen.getByLabelText("Mobile number"), "12345");
    await user.type(screen.getByLabelText("Your message"), "hi");
    await user.click(screen.getByRole("button", { name: "Send message" }));

    expect(
      await screen.findByText("Write your name (2 to 80 letters)."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Enter a 10-digit Indian mobile number."),
    ).toBeInTheDocument();
    expect(screen.getByText("Choose who you are.")).toBeInTheDocument();
    expect(screen.getByText("Choose what it's about.")).toBeInTheDocument();
    expect(
      screen.getByText("Write a little more: at least 5 letters."),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Mobile number")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    expect(send).not.toHaveBeenCalled();
  });

  it("sends a clean message and confirms it", async () => {
    send.mockResolvedValue(null);
    const user = userEvent.setup();
    renderForm();
    await fillIn(user);
    await user.click(screen.getByRole("button", { name: "Send message" }));

    expect(await screen.findByText("Message sent")).toBeInTheDocument();
    expect(send).toHaveBeenCalledWith({
      name: "Ramesh Kumar",
      phone: "+919876543210",
      role: "kabadiwala",
      topic: "trade",
      message: "The yard has not collected my load.",
    });
    expect(screen.getByRole("heading", { name: "Message sent" })).toHaveFocus();
  });

  it("keeps the name and number for another message", async () => {
    send.mockResolvedValue(null);
    const user = userEvent.setup();
    renderForm();
    await fillIn(user);
    await user.click(screen.getByRole("button", { name: "Send message" }));
    await user.click(
      await screen.findByRole("button", { name: "Send another message" }),
    );

    expect(screen.getByLabelText("Your name")).toHaveValue("Ramesh Kumar");
    expect(screen.getByLabelText("Your message")).toHaveValue("");
  });

  it("puts the server's refusal on the right field", async () => {
    send.mockRejectedValue(new ConvexError("INVALID_PHONE"));
    const user = userEvent.setup();
    renderForm();
    await fillIn(user);
    await user.click(screen.getByRole("button", { name: "Send message" }));

    expect(
      await screen.findByText("Enter a 10-digit Indian mobile number."),
    ).toBeInTheDocument();
    expect(screen.queryByText("Message sent")).not.toBeInTheDocument();
  });

  it("says so plainly when the message can't be sent", async () => {
    send.mockRejectedValue(new Error("offline"));
    const user = userEvent.setup();
    renderForm();
    await fillIn(user);
    await user.click(screen.getByRole("button", { name: "Send message" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "We couldn't send that. Check your connection and try again.",
    );
  });
});

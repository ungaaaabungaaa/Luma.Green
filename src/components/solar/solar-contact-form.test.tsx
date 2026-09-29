import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useMutation } from "convex/react";
import { ConvexError } from "convex/values";
import { NextIntlClientProvider } from "next-intl";
import { beforeEach, describe, expect, it, vi } from "vitest";

import messages from "../../../messages/en.json";
import { SolarContactForm } from "./solar-contact-form";

const convex = vi.hoisted(() => ({ configured: true }));

vi.mock("@/components/providers/convex-provider", () => ({
  get isConvexConfigured() {
    return convex.configured;
  },
}));

vi.mock("convex/react", () => ({
  useConvexAuth: () => ({ isLoading: false, isAuthenticated: true }),
  useMutation: vi.fn(),
}));

const send = vi.fn();
const prefill = "For my home: a 3 kW system, from the estimate on this page.";

function renderForm() {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <SolarContactForm kind="home" prefill={prefill} />
    </NextIntlClientProvider>,
  );
}

async function fillIn(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByRole("textbox", { name: "Your name" }), "Asha");
  await user.type(
    screen.getByRole("textbox", { name: "Mobile number" }),
    "98765 43210",
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  convex.configured = true;
  send.mockResolvedValue(null);
  vi.mocked(useMutation).mockReturnValue(
    send as unknown as ReturnType<typeof useMutation>,
  );
});

describe("SolarContactForm", () => {
  it("sends a solar enquiry to the support inbox and thanks them", async () => {
    const user = userEvent.setup();
    renderForm();
    expect(
      screen.getByRole("textbox", { name: "Anything we should know?" }),
    ).toHaveValue(prefill);

    await fillIn(user);
    await user.click(screen.getByRole("button", { name: "Send" }));

    expect(send).toHaveBeenCalledWith({
      name: "Asha",
      phone: "+919876543210",
      role: "household",
      topic: "solar",
      message: prefill,
    });
    expect(await screen.findByRole("status")).toHaveTextContent(
      "Thank you, Asha",
    );

    await user.click(
      screen.getByRole("button", { name: "Send another message" }),
    );
    expect(screen.getByRole("textbox", { name: "Your name" })).toHaveValue("");
  });

  it("checks the form before anything is sent", async () => {
    const user = userEvent.setup();
    renderForm();

    await user.click(screen.getByRole("button", { name: "Send" }));

    expect(await screen.findByText("Enter your name.")).toBeInTheDocument();
    expect(
      screen.getByText("Enter a 10-digit Indian mobile number."),
    ).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Your name" })).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    expect(send).not.toHaveBeenCalled();
  });

  it("shows the server's refusal against the field it was about", async () => {
    send.mockRejectedValue(new ConvexError("INVALID_MESSAGE"));
    const user = userEvent.setup();
    renderForm();

    await fillIn(user);
    await user.click(screen.getByRole("button", { name: "Send" }));

    expect(
      await screen.findByText("Write a few words, up to 1,000 letters."),
    ).toBeInTheDocument();
  });

  it("says when sending failed for any other reason", async () => {
    send.mockRejectedValue(new Error("offline"));
    const user = userEvent.setup();
    renderForm();

    await fillIn(user);
    await user.click(screen.getByRole("button", { name: "Send" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "We couldn't send that. Please try again.",
    );
  });

  it("offers email instead when Convex isn't connected", () => {
    convex.configured = false;
    renderForm();

    expect(
      screen.getByRole("link", { name: "support@luma.green" }),
    ).toHaveAttribute("href", "mailto:support@luma.green");
    expect(
      screen.queryByRole("button", { name: "Send" }),
    ).not.toBeInTheDocument();
  });
});

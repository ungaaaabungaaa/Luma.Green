import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { getFunctionName } from "convex/server";
import { ConvexError } from "convex/values";
import { NextIntlClientProvider } from "next-intl";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import messages from "../../../messages/en.json";
import { SellFlow } from "./sell-flow";

/** The Convex functions the flow calls, answered from fixtures. */
const convex = vi.hoisted(() => ({
  isAuthenticated: false,
  book: vi.fn(),
  ensureProfile: vi.fn(),
}));
const push = vi.hoisted(() => vi.fn());

vi.mock("@/components/providers/convex-provider", () => ({
  isConvexConfigured: true,
}));

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children }: { href: string; children: ReactNode }) => (
    <a href={href}>{children}</a>
  ),
  useRouter: () => ({ push }),
}));

vi.mock("@/lib/auth-client", () => ({
  authClient: {
    signOut: vi.fn(),
    phoneNumber: { sendOtp: vi.fn(), verify: vi.fn() },
  },
}));

const MATERIALS = [
  {
    code: "PAPER-NEWS",
    family: "paper",
    stage: "scrap",
    names: { en: "Newspaper" },
    co2eFactor: 1,
  },
  {
    code: "PLASTIC-PET",
    family: "plastic",
    stage: "scrap",
    names: { en: "PET bottles" },
    co2eFactor: 1.5,
  },
  {
    code: "RECYCLED-PET-FLAKE",
    family: "plastic",
    stage: "recycled",
    names: { en: "Recycled PET flakes" },
    co2eFactor: 1.5,
  },
];

const BOARD = {
  city: "Bengaluru",
  date: "2026-09-29",
  rows: MATERIALS.map((material) => ({
    ...material,
    todayPaise: material.code === "PAPER-NEWS" ? 2200 : 3000,
    weekChangePct: null,
    floorPaise: 1000,
    fallbackPaise: material.code === "PAPER-NEWS" ? 1400 : 2000,
    series: [],
  })),
};

const SHOPS = [
  {
    id: "ramesh",
    name: "Ramesh Kabadi Store",
    area: "Yeshwanthpur",
    address: "12, 4th Cross, Yeshwanthpur, Bengaluru",
    offersPickup: true,
    hours: { opens: "08:00", closes: "20:00" },
    estimatePaise: 7250,
    fallbackCodes: [],
  },
];

/** What each query returns, by function name; anything else is loading. */
const ANSWERS: Partial<Record<string, unknown>> = {
  "catalogue:materials": MATERIALS,
  "catalogue:priceQuotes": {
    rows: BOARD.rows.map((row) => ({
      code: row.code,
      paisePerKg: row.fallbackPaise,
    })),
  },
  "households:shops": SHOPS,
  "identity:me": {
    kind: "member",
    phone: "+919000000109",
    twoFactorEnabled: false,
    hasProfile: true,
  },
};

vi.mock("convex/react", () => ({
  useAction: () => vi.fn(),
  useConvexAuth: () => ({
    isLoading: false,
    isAuthenticated: convex.isAuthenticated,
  }),
  useQuery: (query: never, args: unknown): unknown =>
    args === "skip" ? undefined : ANSWERS[getFunctionName(query)],
  useMutation: (mutation: never) =>
    getFunctionName(mutation) === "households:book"
      ? convex.book
      : convex.ensureProfile,
}));

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

beforeEach(() => {
  // jsdom has no layout, so no scrolling either.
  Element.prototype.scrollIntoView = vi.fn();
  sessionStorage.clear();
  window.history.replaceState(null, "", "/sell");
  convex.isAuthenticated = false;
  convex.book.mockResolvedValue("tok2345678");
  convex.ensureProfile.mockResolvedValue("profile");
  push.mockReset();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("SellFlow", () => {
  it("starts with what they have, and sells only scrap", () => {
    render(withIntl(<SellFlow />));
    expect(
      screen.getByRole("heading", { name: "What do you have?" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /^Newspaper/ }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Recycled PET flakes/ }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Find buyers/ })).toBeDisabled();
  });

  it("keeps the basket in this tab and shows a running estimate", async () => {
    const { unmount } = render(withIntl(<SellFlow />));
    await userEvent.click(screen.getByRole("button", { name: /^Newspaper/ }));
    // Paper starts at 5 kg: 5 × ₹14.
    expect(screen.getByText("₹70")).toBeInTheDocument();
    expect(screen.getByText("1 item · 5 kg")).toBeInTheDocument();

    unmount();
    render(withIntl(<SellFlow />));
    expect(screen.getByRole("button", { name: /^Newspaper/ })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("goes from the basket to a booking and opens its tracking page", async () => {
    convex.isAuthenticated = true;
    vi.stubGlobal("navigator", {
      geolocation: {
        getCurrentPosition: (success: PositionCallback) => {
          success({
            coords: { latitude: 13.021234, longitude: 77.551789 },
          } as GeolocationPosition);
        },
      },
    });
    render(withIntl(<SellFlow />));

    await userEvent.click(screen.getByRole("button", { name: /^Newspaper/ }));
    await userEvent.click(screen.getByRole("button", { name: /Find buyers/ }));
    expect(window.location.search).toBe("?step=shop");
    expect(screen.getByRole("heading", { name: "Who buys it?" })).toHaveFocus();
    await userEvent.click(
      screen.getByRole("button", { name: "Use my location" }),
    );

    await userEvent.click(
      screen.getByRole("radio", { name: /Ramesh Kabadi Store/ }),
    );
    await userEvent.click(
      screen.getByRole("button", { name: /Choose a time/ }),
    );
    expect(
      screen.getByRole("heading", { name: "When should they come?" }),
    ).toBeInTheDocument();

    // Going on without answering points at what's missing.
    await userEvent.click(
      screen.getByRole("button", { name: /Check and book/ }),
    );
    expect(screen.getByText(messages.sell.when.errors.day)).toBeInTheDocument();

    await userEvent.click(screen.getByText("Tomorrow"));
    await userEvent.click(screen.getByRole("radio", { name: /Morning/ }));
    await userEvent.type(
      screen.getByRole("textbox", { name: "Pickup address" }),
      "Flat 4B, Rose Apartments, Yeshwanthpur",
    );
    await userEvent.type(
      screen.getByRole("textbox", { name: "Your name" }),
      "Priya",
    );
    await userEvent.click(
      screen.getByRole("button", { name: /Check and book/ }),
    );

    expect(
      screen.getByRole("heading", { name: "Check and book" }),
    ).toBeInTheDocument();
    expect(screen.getByText("You'll get about ₹72.50")).toBeInTheDocument();
    expect(
      screen.getByText("Booking as ⁦+91 90000 00109⁩"),
    ).toBeInTheDocument();

    expect(screen.getByText(messages.sell.confirm.locationNote)).toBeVisible();
    await userEvent.click(screen.getByRole("button", { name: "Book pickup" }));
    await vi.waitFor(() => {
      expect(push).toHaveBeenCalledWith("/t/tok2345678");
    });
    expect(convex.ensureProfile).toHaveBeenCalledWith({ locale: "en" });
    expect(convex.book).toHaveBeenCalledWith(
      expect.objectContaining({
        orgId: "ramesh",
        mode: "pickup",
        items: [{ materialCode: "PAPER-NEWS", kg: 5 }],
        slotWindow: "morning",
        address: "Flat 4B, Rose Apartments, Yeshwanthpur",
        name: "Priya",
        location: { lat: 13.021, lng: 77.552 },
      }),
    );
    expect(push).toHaveBeenCalledWith("/t/tok2345678");
  });

  it("asks for the mobile number when nobody is signed in", async () => {
    sessionStorage.setItem(
      "lg.sellDraft",
      JSON.stringify({
        items: [{ materialCode: "PAPER-NEWS", kg: 5 }],
        mode: "dropoff",
        shopId: "ramesh",
        slotDate: "2099-01-01",
        slotWindow: "evening",
        address: "",
        name: "Priya",
      }),
    );
    window.history.replaceState(null, "", "/sell?step=confirm");
    render(withIntl(<SellFlow />));

    // A stored day that can't be booked any more sends them back to "When?".
    expect(
      screen.getByRole("heading", { name: "When will you drop it off?" }),
    ).toBeInTheDocument();
    expect(window.location.search).toBe("?step=when");
    await userEvent.click(screen.getByText("Tomorrow"));
    await userEvent.click(screen.getByRole("radio", { name: /Evening/ }));
    await userEvent.click(
      screen.getByRole("button", { name: /Check and book/ }),
    );
    expect(
      screen.getByRole("textbox", { name: "Mobile number" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Send code" })).toBeEnabled();
  });

  it("shows where to fix a booking the server refused", async () => {
    convex.isAuthenticated = true;
    convex.book.mockRejectedValue(new ConvexError("SLOT_PASSED"));
    sessionStorage.setItem(
      "lg.sellDraft",
      JSON.stringify({
        items: [{ materialCode: "PAPER-NEWS", kg: 5 }],
        mode: "pickup",
        shopId: "ramesh",
        slotDate: undefined,
        address: "Flat 4B, Rose Apartments, Yeshwanthpur",
        name: "Priya",
      }),
    );
    window.history.replaceState(null, "", "/sell?step=when");
    render(withIntl(<SellFlow />));
    await userEvent.click(screen.getByText("Tomorrow"));
    await userEvent.click(screen.getByRole("radio", { name: /Afternoon/ }));
    await userEvent.click(
      screen.getByRole("button", { name: /Check and book/ }),
    );
    await userEvent.click(screen.getByRole("button", { name: "Book pickup" }));

    expect(
      await screen.findByText(messages.sell.errors.SLOT_PASSED),
    ).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Fix it" }));
    expect(window.location.search).toBe("?step=when");
    expect(push).not.toHaveBeenCalled();
  });
});

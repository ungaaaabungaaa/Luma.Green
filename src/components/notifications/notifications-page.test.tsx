import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { getFunctionName } from "convex/server";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import ar from "../../../messages/ar.json";
import en from "../../../messages/en.json";
import { NotificationsPage } from "./notifications-page";

const state = vi.hoisted(() => ({
  results: [
    {
      id: "inbox-a",
      event: "booking_confirmed",
      read: false,
      createdAt: 1_790_896_800_000,
    },
  ],
  status: "Exhausted",
  count: 1,
  queryError: false,
  loadMore: vi.fn(),
  markRead: vi.fn(),
  markAllRead: vi.fn(),
}));
vi.mock("@/components/providers/convex-provider", () => ({
  isConvexConfigured: true,
}));
vi.mock("./device-provider", () => ({ useNotificationDevice: () => null }));
vi.mock("convex/react", () => ({
  usePaginatedQuery: () => {
    if (state.queryError) throw new Error("inbox:list is unavailable");
    return {
      results: state.results,
      status: state.status,
      loadMore: state.loadMore,
    };
  },
  useQuery: () => state.count,
  useMutation: (reference: Parameters<typeof getFunctionName>[0]) =>
    getFunctionName(reference) === "inbox:markRead"
      ? state.markRead
      : state.markAllRead,
}));

beforeEach(() => {
  state.results = [
    {
      id: "inbox-a",
      event: "booking_confirmed",
      read: false,
      createdAt: 1_790_896_800_000,
    },
  ];
  state.status = "Exhausted";
  state.count = 1;
  state.queryError = false;
  state.markRead.mockReset().mockResolvedValue(null);
  state.markAllRead.mockReset().mockResolvedValue(null);
});
afterEach(() => {
  vi.restoreAllMocks();
});

function page(locale: "en" | "ar" = "en") {
  return (
    <NextIntlClientProvider
      locale={locale}
      messages={locale === "en" ? en : ar}
    >
      <NotificationsPage />
    </NextIntlClientProvider>
  );
}

describe("account notification inbox", () => {
  it("keeps settings usable when the optional inbox backend is unavailable", () => {
    vi.spyOn(console, "error").mockImplementation(() => {
      // React reports the deliberately caught query failure to the console.
    });
    state.queryError = true;
    render(page());
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      en.notifications.title,
    );
    expect(
      screen.getByRole("heading", { name: en.notifications.deviceTitle }),
    ).toBeVisible();
    expect(screen.getByRole("alert")).toHaveTextContent(
      en.notifications.unavailable,
    );
    expect(
      screen.getByRole("button", { name: en.notifications.enable }),
    ).toBeDisabled();
  });
  it("shows the account update and marks the selected entry read", async () => {
    const user = userEvent.setup();
    render(page());
    expect(
      screen.getByText(en.notifications.events.booking_confirmed),
    ).toBeVisible();
    expect(
      screen.getByRole("button", { name: en.notifications.enable }),
    ).toBeDisabled();
    await user.click(
      screen.getByRole("button", { name: en.notifications.markRead }),
    );
    expect(state.markRead).toHaveBeenCalledWith({ id: "inbox-a" });
  });
  it("keeps the update visible when marking it read fails", async () => {
    const user = userEvent.setup();
    state.markRead.mockRejectedValue(new Error("offline"));
    render(page());
    await user.click(
      screen.getByRole("button", { name: en.notifications.markRead }),
    );
    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(en.common.error);
    });
    expect(
      screen.getByText(en.notifications.events.booking_confirmed),
    ).toBeVisible();
    expect(
      screen.getByRole("button", { name: en.notifications.markRead }),
    ).toBeEnabled();
  });
  it("shows a useful empty state without synthetic events", () => {
    state.results = [];
    state.count = 0;
    render(page());
    expect(screen.getByText(en.notifications.emptyTitle)).toBeVisible();
    expect(
      screen.queryByRole("button", { name: en.notifications.markAllRead }),
    ).not.toBeInTheDocument();
  });
  it("uses Arabic event and action copy", () => {
    render(page("ar"));
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      ar.notifications.title,
    );
    expect(
      screen.getByText(ar.notifications.events.booking_confirmed),
    ).toBeVisible();
    expect(
      screen.getByRole("button", { name: ar.notifications.markRead }),
    ).toBeVisible();
  });
});

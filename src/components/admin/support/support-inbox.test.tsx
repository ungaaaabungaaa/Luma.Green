import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { FunctionReturnType } from "convex/server";
import { toast } from "sonner";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { SupportInbox } from "./support-inbox";

type Requests = FunctionReturnType<typeof api.support.list>;

const list = vi.fn<() => Requests | undefined>();
const markAnswered = vi.fn();

vi.mock("convex/react", () => ({
  useConvexAuth: () => ({ isLoading: false, isAuthenticated: true }),
  useQuery: () => list(),
  useMutation: () => markAnswered,
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const requests: Requests = [
  {
    id: "r1manjunath" as Id<"supportRequests">,
    name: "Manjunath",
    phone: "+919845000021",
    role: "kabadiwala",
    topic: "prices",
    message: "How do I change my price for cardboard?",
    status: "open",
    createdAt: Date.UTC(2026, 8, 29, 4),
  },
  {
    id: "r2sunita" as Id<"supportRequests">,
    name: "Sunita",
    phone: "+919845000022",
    role: "household",
    topic: "solar",
    message: "Is rooftop solar worth it?",
    status: "answered",
    createdAt: Date.UTC(2026, 8, 28, 9),
  },
];

beforeEach(() => {
  vi.clearAllMocks();
  list.mockReturnValue(requests);
});

describe("SupportInbox", () => {
  it("opens on the requests still waiting, with a way to call back", () => {
    render(<SupportInbox />);
    expect(screen.getByRole("tab", { name: "Open (1)" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(
      screen.getByRole("heading", { name: "Manjunath" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Prices")).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Sunita" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Call +91 98450 00021" }),
    ).toHaveAttribute("href", "tel:+919845000021");
  });

  it("marks a request answered", async () => {
    markAnswered.mockResolvedValue(null);
    const user = userEvent.setup();
    render(<SupportInbox />);
    await user.click(screen.getByRole("button", { name: "Mark answered" }));
    expect(markAnswered).toHaveBeenCalledWith({ id: "r1manjunath" });
    expect(toast.success).toHaveBeenCalledWith(
      "Marked Manjunath's message answered.",
    );
  });

  it("keeps answered requests on their own tab", async () => {
    const user = userEvent.setup();
    render(<SupportInbox />);
    await user.click(screen.getByRole("tab", { name: "Answered" }));
    expect(screen.getByRole("heading", { name: "Sunita" })).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Mark answered" }),
    ).not.toBeInTheDocument();
  });

  it("says when the inbox is empty", () => {
    list.mockReturnValue([]);
    render(<SupportInbox />);
    expect(screen.getByText("No open requests")).toBeInTheDocument();
  });
});

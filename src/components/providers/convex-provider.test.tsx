import { fireEvent, render, screen } from "@testing-library/react";
import { type ReactNode, StrictMode, useState } from "react";
import { beforeEach, expect, it, vi } from "vitest";

import { ConvexClientProvider } from "./convex-provider";

const state = vi.hoisted<{
  userId: string | null;
  sessionId: string;
  clients: ReturnType<typeof vi.fn<() => void>>;
}>(() => ({
  userId: "user-a",
  sessionId: "session-a",
  clients: vi.fn(),
}));
vi.mock("@/lib/env", () => ({
  clientEnv: { NEXT_PUBLIC_CONVEX_URL: "http://127.0.0.1:3210" },
}));
vi.mock("@/lib/auth-client", () => ({
  authClient: {
    useSession: () => ({
      data: state.userId
        ? { user: { id: state.userId }, session: { id: state.sessionId } }
        : null,
    }),
  },
}));
vi.mock("convex/react", () => ({
  ConvexReactClient: class {
    readonly url: string;
    constructor(url: string) {
      this.url = url;
      state.clients();
    }
  },
}));
vi.mock("@convex-dev/better-auth/react", () => ({
  // The installed provider owns cached token and confirmed Convex state. A new
  // provider starts loading even when its parent still observed authenticated A.
  ConvexBetterAuthProvider: ({ children }: { children: ReactNode }) => {
    const [confirmedUser, confirm] = useState<string | null>(null);
    return confirmedUser ? (
      <>
        <p>{confirmedUser}</p>
        {children}
      </>
    ) : (
      <button
        onClick={() => {
          confirm(state.userId ?? "anonymous");
        }}
      >
        Confirm current identity
      </button>
    );
  },
}));
function PrivateForm() {
  const [secret, setSecret] = useState("");
  return (
    <input
      aria-label="Private form"
      value={secret}
      onChange={(event) => {
        setSecret(event.target.value);
      }}
    />
  );
}
function view() {
  return (
    <StrictMode>
      <ConvexClientProvider>
        <PrivateForm />
      </ConvexClientProvider>
    </StrictMode>
  );
}
beforeEach(() => {
  state.userId = "user-a";
  state.sessionId = "session-a";
  state.clients.mockClear();
});
it("hides the old identity and form synchronously when a different user arrives", () => {
  const rendered = render(view());
  fireEvent.click(
    screen.getByRole("button", { name: "Confirm current identity" }),
  );
  fireEvent.change(screen.getByLabelText("Private form"), {
    target: { value: "private-A" },
  });
  const clients = state.clients.mock.calls.length;
  state.userId = "user-b";
  state.sessionId = "session-b";
  rendered.rerender(view());
  expect(screen.queryByText("user-a")).not.toBeInTheDocument();
  expect(screen.queryByLabelText("Private form")).not.toBeInTheDocument();
  fireEvent.click(
    screen.getByRole("button", { name: "Confirm current identity" }),
  );
  expect(screen.getByText("user-b")).toBeVisible();
  expect(screen.getByLabelText("Private form")).toHaveValue("");
  expect(state.clients).toHaveBeenCalledTimes(clients);
});
it("keeps same-user TOTP session rotation mounted without another client", () => {
  const rendered = render(view());
  fireEvent.click(
    screen.getByRole("button", { name: "Confirm current identity" }),
  );
  fireEvent.change(screen.getByLabelText("Private form"), {
    target: { value: "recovery-codes" },
  });
  const clients = state.clients.mock.calls.length;
  state.sessionId = "rotated-session-a";
  rendered.rerender(view());
  expect(screen.getByLabelText("Private form")).toHaveValue("recovery-codes");
  expect(state.clients).toHaveBeenCalledTimes(clients);
});

it("keeps the in-progress public confirmation mounted during initial phone verification", () => {
  state.userId = null;
  const rendered = render(view());
  fireEvent.click(
    screen.getByRole("button", { name: "Confirm current identity" }),
  );
  fireEvent.change(screen.getByLabelText("Private form"), {
    target: { value: "public-booking-continuation" },
  });
  const field = screen.getByLabelText("Private form");
  state.userId = "new-household";
  state.sessionId = "household-session";
  rendered.rerender(view());
  expect(screen.getByLabelText("Private form")).toBe(field);
  expect(field).toHaveValue("public-booking-continuation");
});

it("resets the prior private identity at logout before another user signs in", () => {
  const rendered = render(view());
  fireEvent.click(
    screen.getByRole("button", { name: "Confirm current identity" }),
  );
  fireEvent.change(screen.getByLabelText("Private form"), {
    target: { value: "private-A" },
  });
  state.userId = null;
  rendered.rerender(view());
  expect(screen.queryByText("user-a")).not.toBeInTheDocument();
  expect(screen.queryByLabelText("Private form")).not.toBeInTheDocument();
  state.userId = "user-b";
  state.sessionId = "session-b";
  rendered.rerender(view());
  expect(screen.queryByLabelText("Private form")).not.toBeInTheDocument();
  fireEvent.click(
    screen.getByRole("button", { name: "Confirm current identity" }),
  );
  expect(screen.getByText("user-b")).toBeVisible();
  expect(screen.getByLabelText("Private form")).toHaveValue("");
});

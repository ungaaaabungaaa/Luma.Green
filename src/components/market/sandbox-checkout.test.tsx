import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { getFunctionName } from "convex/server";
import { NextIntlClientProvider } from "next-intl";
import type { ReactNode } from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

import type { Id } from "../../../convex/_generated/dataModel";
import messages from "../../../messages/en.json";
import { SandboxCheckout } from "./sandbox-checkout";

const state = vi.hoisted(() => ({
  org: "org-a",
  canOperate: true,
  enabled: false,
  liveEnabled: false,
  status: [] as { mode: string; checkout: string; collection: string }[],
  checkout: vi.fn(),
}));
vi.mock("@/components/shop/use-shop", () => ({
  useBusiness: () => ({ id: state.org }),
}));
vi.mock("@/components/workspace/permissions", () => ({
  useCanOperate: () => state.canOperate,
}));
vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children }: { href: string; children: ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));
vi.mock("convex/react", () => ({
  useAction: () => state.checkout,
  useQuery: (query: Parameters<typeof getFunctionName>[0]) =>
    getFunctionName(query) === "cashfreePayments:availability"
      ? {
          sandboxEnabled: state.enabled,
          canCheckout: state.enabled,
          liveCanCheckout: state.liveEnabled,
        }
      : state.status,
}));
const tradeId = "trade-a" as Id<"trades">;
const result = {
  status: { mode: "sandbox", checkout: "ready", collection: "pending" },
  paymentSessionId: "synthetic-session",
};
const sdkSelector = 'script[src="https://sdk.cashfree.com/js/v3/cashfree.js"]';
beforeEach(() => {
  state.org = "org-a";
  state.canOperate = true;
  state.enabled = false;
  state.liveEnabled = false;
  state.status = [];
  state.checkout.mockReset();
  state.checkout.mockResolvedValue(result);
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  document.querySelectorAll(sdkSelector).forEach((node) => {
    node.remove();
  });
});

it("recovers from a stalled SDK load and ignores the old script's late load", async () => {
  vi.useFakeTimers();
  state.enabled = true;
  const factory = vi.fn();
  vi.stubGlobal("Cashfree", factory);
  render(view());
  fireEvent.click(
    screen.getByRole("button", { name: messages.sandboxPayment.title }),
  );
  fireEvent.click(
    screen.getByRole("button", { name: messages.sandboxPayment.open }),
  );
  await act(async () => {
    await Promise.resolve();
  });
  const script = document.querySelector(sdkSelector);
  if (!script) throw new Error("Missing SDK script");
  await act(async () => {
    await vi.advanceTimersByTimeAsync(15_000);
  });
  expect(screen.getByRole("alert")).toHaveTextContent(
    messages.sandboxPayment.failed,
  );
  expect(
    screen.getByRole("button", { name: messages.sandboxPayment.open }),
  ).toBeEnabled();
  expect(document.querySelector(sdkSelector)).toBeNull();
  fireEvent.load(script);
  expect(factory).not.toHaveBeenCalled();
});
function view() {
  return (
    <NextIntlClientProvider locale="en" messages={messages}>
      <SandboxCheckout tradeId={tradeId} />
    </NextIntlClientProvider>
  );
}
async function open() {
  await userEvent.click(
    screen.getByRole("button", { name: messages.sandboxPayment.title }),
  );
}

it("makes no SDK request or action when sandbox configuration is absent", async () => {
  render(view());
  await open();
  expect(screen.getByText(messages.sandboxPayment.unavailable)).toBeVisible();
  expect(
    screen.queryByRole("button", { name: messages.sandboxPayment.open }),
  ).not.toBeInTheDocument();
  expect(document.querySelector(sdkSelector)).toBeNull();
  expect(state.checkout).not.toHaveBeenCalled();
  expect(
    screen.queryByRole("button", { name: messages.sandboxPayment.liveTitle }),
  ).not.toBeInTheDocument();
});

it("requests live checkout explicitly and maps only its verified session mode to production SDK mode", async () => {
  state.liveEnabled = true;
  state.checkout.mockResolvedValue({
    ...result,
    status: { ...result.status, mode: "live" },
  });
  const factory = vi.fn(() => ({ checkout: vi.fn().mockResolvedValue({}) }));
  vi.stubGlobal("Cashfree", factory);
  render(view());
  await userEvent.click(
    screen.getByRole("button", { name: messages.sandboxPayment.liveTitle }),
  );
  await userEvent.click(
    screen.getByRole("button", { name: messages.sandboxPayment.liveOpen }),
  );
  expect(state.checkout).toHaveBeenCalledExactlyOnceWith({
    tradeId,
    mode: "live",
  });
  const script = document.querySelector(sdkSelector);
  if (!script) throw new Error("Missing SDK script");
  await act(async () => {
    fireEvent.load(script);
    await Promise.resolve();
  });
  expect(factory).toHaveBeenCalledWith({ mode: "production" });
  expect(
    screen.queryByText(messages.sandboxPayment.liveCollected),
  ).not.toBeInTheDocument();
});

it("rejects a sandbox session returned to a live checkout request", async () => {
  state.liveEnabled = true;
  render(view());
  await userEvent.click(
    screen.getByRole("button", { name: messages.sandboxPayment.liveTitle }),
  );
  await userEvent.click(
    screen.getByRole("button", { name: messages.sandboxPayment.liveOpen }),
  );
  expect(document.querySelector(sdkSelector)).toBeNull();
  expect(screen.getByRole("alert")).toHaveTextContent(
    messages.sandboxPayment.failed,
  );
});
it("does not expose a checkout action to a viewer even if a stale hint says enabled", async () => {
  state.enabled = true;
  state.canOperate = false;
  render(view());
  await open();
  expect(
    screen.queryByRole("button", { name: messages.sandboxPayment.open }),
  ).not.toBeInTheDocument();
});
it.each([
  { ...result, status: { ...result.status, mode: "live" } },
  { ...result, paymentSessionId: null },
  { ...result, status: { ...result.status, collection: "sandbox_confirmed" } },
])(
  "does not load the SDK for an ineligible server checkout result",
  async (serverResult) => {
    state.enabled = true;
    state.checkout.mockResolvedValue(serverResult);
    render(view());
    await open();
    await userEvent.click(
      screen.getByRole("button", { name: messages.sandboxPayment.open }),
    );
    expect(document.querySelector(sdkSelector)).toBeNull();
  },
);
it("rejects an action result that arrives after workspace switch", async () => {
  const { promise, resolve } = Promise.withResolvers<unknown>();
  state.enabled = true;
  state.checkout.mockReturnValue(promise);
  const ui = render(view());
  await open();
  await userEvent.click(
    screen.getByRole("button", { name: messages.sandboxPayment.open }),
  );
  state.org = "org-b";
  ui.rerender(view());
  await act(async () => {
    resolve(result);
    await promise;
  });
  expect(document.querySelector(sdkSelector)).toBeNull();
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
});
it("removes a pending SDK script on permission loss and never launches its late load", async () => {
  state.enabled = true;
  const factory = vi.fn();
  vi.stubGlobal("Cashfree", factory);
  const ui = render(view());
  await open();
  await userEvent.click(
    screen.getByRole("button", { name: messages.sandboxPayment.open }),
  );
  const script = document.querySelector(sdkSelector);
  expect(script).not.toBeNull();
  state.canOperate = false;
  ui.rerender(view());
  await waitFor(() => {
    expect(document.querySelector(sdkSelector)).toBeNull();
  });
  if (script) fireEvent.load(script);
  expect(factory).not.toHaveBeenCalled();
});
it("ignores SDK success-like data and shows confirmation only from the server query", async () => {
  state.enabled = true;
  state.status = [
    { mode: "sandbox", checkout: "ready", collection: "pending" },
  ];
  const providerCheckout = vi
    .fn()
    .mockResolvedValue({ paymentDetails: { paymentMessage: "SUCCESS" } });
  vi.stubGlobal(
    "Cashfree",
    vi.fn(() => ({ checkout: providerCheckout })),
  );
  const ui = render(view());
  await open();
  await userEvent.click(
    screen.getByRole("button", { name: messages.sandboxPayment.open }),
  );
  const script = document.querySelector(sdkSelector);
  if (!script) throw new Error("Missing SDK script");
  await act(async () => {
    fireEvent.load(script);
    await Promise.resolve();
  });
  expect(providerCheckout).toHaveBeenCalledWith(
    expect.objectContaining({
      paymentSessionId: "synthetic-session",
      redirectTarget: expect.any(HTMLElement),
    }),
  );
  expect(screen.getByRole("status")).toHaveTextContent(
    messages.sandboxPayment.pending,
  );
  expect(
    screen.queryByText(messages.sandboxPayment.collected),
  ).not.toBeInTheDocument();
  state.status = [
    { mode: "sandbox", checkout: "closed", collection: "sandbox_confirmed" },
  ];
  ui.rerender(view());
  expect(screen.getByRole("status")).toHaveTextContent(
    messages.sandboxPayment.collected,
  );
  expect(document.querySelector(sdkSelector)).toBeNull();
});
it("shows a safe retry after an SDK load error without logging provider contents", async () => {
  state.enabled = true;
  render(view());
  await open();
  await userEvent.click(
    screen.getByRole("button", { name: messages.sandboxPayment.open }),
  );
  const script = document.querySelector(sdkSelector);
  if (!script) throw new Error("Missing SDK script");
  await act(async () => {
    fireEvent.error(script);
    await Promise.resolve();
  });
  expect(screen.getByRole("alert")).toHaveTextContent(
    messages.sandboxPayment.failed,
  );
  expect(
    screen.getByRole("button", { name: messages.sandboxPayment.open }),
  ).toBeEnabled();
});

it("shows a generic retry when the SDK resolves with an error object", async () => {
  state.enabled = true;
  vi.stubGlobal(
    "Cashfree",
    vi.fn(() => ({
      checkout: vi
        .fn()
        .mockResolvedValue({ error: { code: "PROVIDER_PRIVATE_DETAIL" } }),
    })),
  );
  render(view());
  await open();
  await userEvent.click(
    screen.getByRole("button", { name: messages.sandboxPayment.open }),
  );
  const script = document.querySelector(sdkSelector);
  if (!script) throw new Error("Missing SDK script");
  await act(async () => {
    fireEvent.load(script);
    await Promise.resolve();
  });
  expect(screen.getByRole("alert")).toHaveTextContent(
    messages.sandboxPayment.failed,
  );
  expect(screen.queryByText("PROVIDER_PRIVATE_DETAIL")).not.toBeInTheDocument();
  expect(
    screen.getByRole("button", { name: messages.sandboxPayment.open }),
  ).toBeEnabled();
});

it("reports a closed sandbox order as unavailable rather than pending", async () => {
  state.status = [
    { mode: "sandbox", checkout: "closed", collection: "pending" },
  ];
  render(view());
  await open();
  expect(screen.getByRole("status")).toHaveTextContent(
    messages.sandboxPayment.unavailable,
  );
  expect(
    screen.queryByRole("button", { name: messages.sandboxPayment.open }),
  ).not.toBeInTheDocument();
});

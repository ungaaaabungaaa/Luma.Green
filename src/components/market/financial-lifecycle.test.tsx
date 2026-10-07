import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { type FunctionReturnType, getFunctionName } from "convex/server";
import { beforeEach, expect, it, vi } from "vitest";

import type { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import messages from "../../../messages/en.json";
import { FinancialLifecycle } from "./financial-lifecycle";
import { WithIntl } from "./test-utils";

type Status = FunctionReturnType<typeof api.cashfreeLifecycle.status>;
const mock = vi.hoisted(() => ({
  status: null as Status | undefined,
  canOperate: true,
  act: vi.fn(),
  cancel: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
}));
vi.mock("convex/react", () => ({
  useQuery: () => mock.status,
  useMutation: (fn: Parameters<typeof getFunctionName>[0]) =>
    getFunctionName(fn).endsWith(":act") ? mock.act : mock.cancel,
}));
vi.mock("@/components/workspace/permissions", () => ({
  useCanOperate: () => mock.canOperate,
}));
vi.mock("./sandbox-checkout", () => ({ SandboxCheckout: () => null }));
vi.mock("sonner", () => ({
  toast: { success: mock.success, error: mock.error },
}));
const id = "trade-a" as Id<"trades">;
const awaiting: NonNullable<Status> = {
  state: "awaiting_payment",
  collection: "pending",
  settlement: "pending",
  refund: "none",
  actions: ["cancel"],
  policyReady: false,
  totalPaise: 12_500,
  grams: 1000,
};
beforeEach(() => {
  mock.status = { ...awaiting };
  mock.canOperate = true;
  mock.act.mockReset().mockResolvedValue(null);
  mock.cancel.mockReset().mockResolvedValue(null);
  mock.success.mockReset();
  mock.error.mockReset();
});
function view() {
  return (
    <WithIntl>
      <FinancialLifecycle tradeId={id} />
    </WithIntl>
  );
}

it("requires an explicit cancellation reason and never marks payment in the browser", async () => {
  const user = userEvent.setup();
  render(view());
  expect(screen.getByText(messages.tradeLifecycle.policyMissing)).toBeVisible();
  await user.click(
    screen.getByRole("button", { name: messages.tradeLifecycle.action.cancel }),
  );
  expect(mock.cancel).not.toHaveBeenCalled();
  expect(
    screen.getByRole("button", { name: messages.tradeLifecycle.confirm }),
  ).toBeDisabled();
  await user.type(
    screen.getByRole("textbox", { name: messages.tradeLifecycle.reason }),
    "Duplicate order",
  );
  await user.click(
    screen.getByRole("button", { name: messages.tradeLifecycle.confirm }),
  );
  expect(mock.cancel).toHaveBeenCalledExactlyOnceWith({
    tradeId: id,
    reason: "Duplicate order",
  });
  expect(mock.act).not.toHaveBeenCalled();
  expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
});

it("retains a failed receipt reference for a safe retry", async () => {
  mock.status = {
    ...awaiting,
    state: "dispatched",
    collection: "live_confirmed",
    actions: ["receive"],
    policyReady: true,
  };
  mock.act.mockRejectedValue(new Error("temporary failure"));
  const user = userEvent.setup();
  render(view());
  await user.click(
    screen.getByRole("button", {
      name: messages.tradeLifecycle.action.receive,
    }),
  );
  await user.type(
    screen.getByRole("textbox", { name: messages.tradeLifecycle.reference }),
    "Goods receipt 41",
  );
  await user.click(
    screen.getByRole("button", { name: messages.tradeLifecycle.confirm }),
  );
  expect(mock.act).toHaveBeenCalledExactlyOnceWith({
    tradeId: id,
    action: "receive",
    reference: "Goods receipt 41",
  });
  expect(screen.getByRole("alert")).toHaveTextContent(
    messages.tradeLifecycle.failed,
  );
  expect(screen.getByRole("textbox")).toHaveValue("Goods receipt 41");
});

it("hides operational actions from a viewer despite a stale action hint", () => {
  mock.canOperate = false;
  render(view());
  expect(screen.queryByRole("button")).not.toBeInTheDocument();
});

it("disables a draft action when fresh server evidence removes permission", async () => {
  const user = userEvent.setup();
  const rendered = render(view());
  await user.click(
    screen.getByRole("button", { name: messages.tradeLifecycle.action.cancel }),
  );
  await user.type(screen.getByRole("textbox"), "Duplicate order");
  mock.status = { ...awaiting, state: "hold", actions: [] };
  rendered.rerender(view());
  expect(
    screen.getByRole("button", { name: messages.tradeLifecycle.confirm }),
  ).toBeDisabled();
  expect(screen.getByRole("textbox")).toHaveValue("Duplicate order");
  expect(mock.cancel).not.toHaveBeenCalled();
});

it("does not reinterpret a legacy status as verified financial evidence", () => {
  mock.status = null;
  render(view());
  expect(
    screen.getByText(messages.market.trades.legacyUnverified),
  ).toBeVisible();
  expect(screen.queryByRole("button")).not.toBeInTheDocument();
});

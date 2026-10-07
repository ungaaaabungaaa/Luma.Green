import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { getFunctionName } from "convex/server";
import { beforeEach, expect, it, vi } from "vitest";

import { PaymentLifecycleSetup } from "./payment-lifecycle";

const mock = vi.hoisted(() => ({
  save: vi.fn(),
  reconcile: vi.fn(),
  refund: vi.fn(),
  rows: false,
  canRefund: true,
}));
vi.mock("convex/react", () => ({
  useQuery: () => ({
    configuredVersion: null,
    liveEnabled: false,
    policy: null,
  }),
  useMutation: () => mock.save,
  useAction: (fn: Parameters<typeof getFunctionName>[0]) =>
    getFunctionName(fn).endsWith(":reconcileForAdmin")
      ? mock.reconcile
      : mock.refund,
  usePaginatedQuery: () => ({
    results: mock.rows
      ? [
          {
            tradeId: "trade-a",
            sellerName: "Example seller",
            buyerName: "Example buyer",
            totalPaise: 12_500,
            refundablePaise: 12_500,
            grams: 1000,
            state: "hold",
            collection: "live_confirmed",
            settlement: "pending",
            refund: "none",
            canRefund: mock.canRefund,
            canReconcile: true,
          },
        ]
      : [],
    status: "Exhausted",
    loadMore: vi.fn(),
  }),
}));
beforeEach(() => {
  mock.save.mockReset().mockResolvedValue("policy-a");
  mock.reconcile.mockReset().mockResolvedValue(null);
  mock.refund.mockReset().mockResolvedValue(null);
  mock.rows = false;
  mock.canRefund = true;
});

async function submitPolicy(user: ReturnType<typeof userEvent.setup>) {
  const dialog = within(screen.getByRole("dialog"));
  expect(
    dialog.getByRole("button", { name: "Save approved version" }),
  ).toBeDisabled();
  await user.type(
    dialog.getByRole("textbox", { name: "Policy version" }),
    "launch-v1",
  );
  await user.click(
    dialog.getByRole("combobox", { name: "Who bears gateway fees?" }),
  );
  await user.click(screen.getByRole("option", { name: "Luma" }));
  await user.click(
    dialog.getByRole("combobox", { name: "Who funds refunds?" }),
  );
  await user.click(screen.getByRole("option", { name: "Seller" }));
  await user.type(
    dialog.getByRole("textbox", {
      name: "Approved settlement terms reference",
    }),
    "Terms reviewed 7",
  );
  await user.type(
    dialog.getByRole("textbox", { name: "Provider acceptance test reference" }),
    "Acceptance run 8",
  );
  await user.click(
    dialog.getByRole("button", { name: "Save approved version" }),
  );
}

it("keeps policy approval separate from live activation and requires explicit fee parties", async () => {
  const user = userEvent.setup();
  render(<PaymentLifecycleSetup />);
  expect(screen.getByText("Off")).toBeVisible();
  await user.click(
    screen.getByRole("button", { name: "Record approved policy" }),
  );
  await submitPolicy(user);
  expect(mock.save).toHaveBeenCalledExactlyOnceWith({
    version: "launch-v1",
    feePayer: "platform",
    refundFunder: "seller",
    refundAuthority: "platform_admin",
    settlementTermsReference: "Terms reviewed 7",
    providerAcceptanceReference: "Acceptance run 8",
  });
  expect(mock.refund).not.toHaveBeenCalled();
  expect(screen.getByText("Off")).toBeVisible();
  expect(screen.getByRole("status")).toHaveTextContent(
    "Approved policy recorded. It stays inactive",
  );
});

it("requires a second confirmation and references before requesting a full remaining refund", async () => {
  mock.rows = true;
  const user = userEvent.setup();
  render(<PaymentLifecycleSetup />);
  await user.click(
    screen.getByRole("button", { name: "Request remaining refund" }),
  );
  expect(mock.refund).not.toHaveBeenCalled();
  expect(
    screen.getByText(/full remaining refundable amount: ₹125/),
  ).toBeVisible();
  await user.type(
    screen.getByRole("textbox", { name: "Refund reference" }),
    "Approved cancellation 11",
  );
  await user.type(
    screen.getByRole("textbox", { name: "Approved refund reason" }),
    "Order cancelled before dispatch",
  );
  await user.click(
    screen.getByRole("button", { name: "Confirm refund request" }),
  );
  expect(mock.refund).toHaveBeenCalledExactlyOnceWith({
    tradeId: "trade-a",
    reference: "Approved cancellation 11",
    reason: "Order cancelled before dispatch",
  });
  expect(screen.getByRole("status")).toHaveTextContent(
    "Read the updated evidence status",
  );
});

it("retains the reference after a refund request fails", async () => {
  mock.rows = true;
  mock.refund.mockRejectedValue(new Error("timeout"));
  const user = userEvent.setup();
  render(<PaymentLifecycleSetup />);
  await user.click(
    screen.getByRole("button", { name: "Request remaining refund" }),
  );
  await user.type(
    screen.getByRole("textbox", { name: "Refund reference" }),
    "Refund 12",
  );
  await user.type(
    screen.getByRole("textbox", { name: "Approved refund reason" }),
    "Approved return",
  );
  await user.click(
    screen.getByRole("button", { name: "Confirm refund request" }),
  );
  expect(screen.getByRole("alert")).toHaveTextContent(
    "Recheck provider evidence before retrying",
  );
  expect(screen.getByRole("textbox", { name: "Refund reference" })).toHaveValue(
    "Refund 12",
  );
});

it("does not expose a refund action when server eligibility is false", () => {
  mock.rows = true;
  mock.canRefund = false;
  render(<PaymentLifecycleSetup />);
  expect(
    screen.queryByRole("button", { name: "Request remaining refund" }),
  ).not.toBeInTheDocument();
});

it("only requests a fresh provider read when reconciliation is selected", async () => {
  mock.rows = true;
  const user = userEvent.setup();
  render(<PaymentLifecycleSetup />);
  await user.click(
    screen.getByRole("button", { name: "Recheck provider evidence" }),
  );
  expect(mock.reconcile).toHaveBeenCalledExactlyOnceWith({
    tradeId: "trade-a",
  });
  expect(mock.refund).not.toHaveBeenCalled();
});

it("keeps a policy draft mounted while its save is pending", async () => {
  const completion = Promise.withResolvers<string>();
  mock.save.mockReturnValue(completion.promise);
  const user = userEvent.setup();
  render(<PaymentLifecycleSetup />);
  await user.click(
    screen.getByRole("button", { name: "Record approved policy" }),
  );
  await submitPolicy(user);
  await user.keyboard("{Escape}");
  expect(screen.getByRole("dialog")).toBeVisible();
  expect(screen.getByRole("textbox", { name: "Policy version" })).toHaveValue(
    "launch-v1",
  );
  await act(async () => {
    completion.resolve("policy-a");
    await Promise.resolve();
  });
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
});

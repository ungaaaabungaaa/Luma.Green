import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, it, vi } from "vitest";

import { PaymentSetup } from "./payment-setup";

vi.mock("./payment-lifecycle", () => ({ PaymentLifecycleSetup: () => null }));

const mock = vi.hoisted(() => ({
  register: vi.fn(),
  verify: vi.fn(),
  loadMore: vi.fn(),
  vendors: [] as {
    mode: string;
    vendorId: string;
    providerStatus: string;
    checkedAt: number;
  }[],
}));
vi.mock("convex/react", () => ({
  useQuery: () => ({ mode: null, sandboxCheckout: false }),
  useMutation: () => mock.register,
  useAction: () => mock.verify,
  usePaginatedQuery: () => ({
    results: [
      {
        orgId: "test-org",
        name: "Example business",
        active: true,
        vendors: mock.vendors,
      },
    ],
    status: "CanLoadMore",
    loadMore: mock.loadMore,
  }),
}));
beforeEach(() => {
  mock.register.mockReset().mockResolvedValue(null);
  mock.verify.mockReset();
  mock.loadMore.mockReset();
  mock.vendors = [];
});

it("explains the live hold and saves only an explicit fixed reference", async () => {
  const user = userEvent.setup();
  render(<PaymentSetup />);
  expect(
    screen.getByRole("heading", {
      name: "Payment activation requires approved setup",
    }),
  ).toBeVisible();
  await user.click(
    screen.getByRole("button", { name: "Add vendor reference" }),
  );
  const dialog = within(screen.getByRole("dialog"));
  expect(dialog.getByText(/This mapping is fixed after saving/)).toBeVisible();
  expect(
    dialog.getByRole("button", { name: "Save fixed reference" }),
  ).toBeDisabled();
  await user.type(
    dialog.getByRole("textbox", { name: "Cashfree vendor reference" }),
    "test_vendor",
  );
  await user.click(
    dialog.getByRole("button", { name: "Save fixed reference" }),
  );
  expect(mock.register).toHaveBeenCalledExactlyOnceWith({
    orgId: "test-org",
    mode: "sandbox",
    vendorId: "test_vendor",
  });
  expect(mock.verify).not.toHaveBeenCalled();
});

it("keeps provider lookup unavailable without keys and exposes pagination", async () => {
  mock.vendors = [
    {
      mode: "sandbox",
      vendorId: "test_vendor",
      providerStatus: "UNVERIFIED",
      checkedAt: 0,
    },
  ];
  const user = userEvent.setup();
  render(<PaymentSetup />);
  expect(
    screen.getByRole("button", { name: "Check with Cashfree" }),
  ).toBeDisabled();
  expect(screen.getByText("UNVERIFIED")).toBeVisible();
  await user.click(
    screen.getByRole("button", { name: "Load more businesses" }),
  );
  expect(mock.loadMore).toHaveBeenCalledExactlyOnceWith(20);
  expect(mock.verify).not.toHaveBeenCalled();
});

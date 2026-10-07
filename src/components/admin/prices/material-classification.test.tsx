import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { FunctionReturnType } from "convex/server";
import { ConvexError } from "convex/values";
import { beforeEach, expect, it, vi } from "vitest";

import type { api } from "../../../../convex/_generated/api";
import { MaterialClassification } from "./material-classification";

const mocks = vi.hoisted(() => ({
  query:
    vi.fn<
      () =>
        FunctionReturnType<typeof api.byproductClassification.list> | undefined
    >(),
  mutate: vi.fn(),
  toast: vi.fn(),
}));
vi.mock("convex/react", () => ({
  useQuery: () => mocks.query(),
  useMutation: () => mocks.mutate,
}));
vi.mock("sonner", () => ({ toast: { error: mocks.toast } }));
vi.mock("@/components/ui/select", () => ({
  Select: ({
    value,
    onValueChange,
    disabled,
    children,
  }: {
    value?: string;
    onValueChange: (value: string) => void;
    disabled?: boolean;
    children: React.ReactNode;
  }) => (
    <select
      aria-label="Selection"
      value={value}
      disabled={disabled}
      onChange={(event) => {
        onValueChange(event.target.value);
      }}
    >
      <option value="">Choose</option>
      {children}
    </select>
  ),
  SelectTrigger: () => null,
  SelectValue: () => null,
  SelectContent: ({ children }: { children: React.ReactNode }) => children,
  SelectItem: ({
    value,
    children,
  }: {
    value: string;
    children: React.ReactNode;
  }) => <option value={value}>{children}</option>,
}));
const rows: FunctionReturnType<typeof api.byproductClassification.list> = [
  { code: "PLASTIC-PET", name: "PET bottles", review: null },
  {
    code: "PAPER-NEWS",
    name: "Newspaper",
    review: {
      hazardStatus: "non_hazardous",
      sourceReference: "Previous review",
      reviewedAt: 1_700_000_000_000,
    },
  },
];
beforeEach(() => {
  mocks.query.mockReturnValue(rows);
  mocks.mutate.mockReset();
  mocks.toast.mockReset();
});
async function selectMaterial() {
  const user = userEvent.setup();
  render(<MaterialClassification />);
  await user.selectOptions(screen.getAllByRole("combobox")[0], "PLASTIC-PET");
  return user;
}
it("requires an explicit status and evidence before any write", async () => {
  const user = await selectMaterial();
  expect(mocks.mutate).not.toHaveBeenCalled();
  expect(screen.getByText("Current review: Not reviewed")).toBeVisible();
  await user.click(screen.getByRole("button", { name: "Save classification" }));
  expect(screen.getByText("Choose a classification.")).toBeVisible();
  expect(screen.getByText("Enter at least 3 characters.")).toBeVisible();
  expect(mocks.mutate).not.toHaveBeenCalled();
});
it("saves exact trimmed evidence and blocks duplicate submissions", async () => {
  const user = await selectMaterial();
  const pending = Promise.withResolvers<null>();
  mocks.mutate.mockReturnValue(pending.promise);
  await user.selectOptions(screen.getAllByRole("combobox")[1], "hazardous");
  await user.type(screen.getByRole("textbox"), "  Lab reference 42  ");
  await user.click(screen.getByRole("button", { name: "Save classification" }));
  expect(screen.getByRole("button", { name: "Saving review…" })).toBeDisabled();
  expect(mocks.mutate).toHaveBeenCalledExactlyOnceWith({
    materialCode: "PLASTIC-PET",
    hazardStatus: "hazardous",
    sourceReference: "Lab reference 42",
  });
  await act(async () => {
    pending.resolve(null);
    await pending.promise;
  });
  expect(screen.getByRole("status")).toHaveTextContent("Classification saved");
});
it("does not carry an unsaved decision to another material", async () => {
  const user = await selectMaterial();
  await user.selectOptions(screen.getAllByRole("combobox")[1], "hazardous");
  await user.type(screen.getByRole("textbox"), "Private draft reference");
  await user.selectOptions(screen.getAllByRole("combobox")[0], "PAPER-NEWS");
  expect(screen.getByRole("textbox")).toHaveValue("");
  expect(screen.getByText("Reference: Previous review")).toBeVisible();
  expect(screen.getAllByRole("combobox")[1]).toHaveValue("");
  expect(mocks.mutate).not.toHaveBeenCalled();
});
it("keeps evidence for retry and explains an expired admin session", async () => {
  const user = await selectMaterial();
  mocks.mutate.mockRejectedValue(new ConvexError("NOT_SIGNED_IN"));
  await user.selectOptions(screen.getAllByRole("combobox")[1], "non_hazardous");
  await user.type(screen.getByRole("textbox"), "Review 42");
  await user.click(screen.getByRole("button", { name: "Save classification" }));
  expect(screen.getByRole("alert")).toHaveTextContent("Sign in again");
  expect(screen.getByRole("textbox")).toHaveValue("Review 42");
  expect(
    screen.getByRole("button", { name: "Save classification" }),
  ).toBeEnabled();
});
it("explains loading and the empty catalogue without creating data", () => {
  mocks.query.mockReturnValue(undefined);
  const { rerender } = render(<MaterialClassification />);
  expect(screen.getByRole("status")).toHaveTextContent(
    "Loading material classifications",
  );
  mocks.query.mockReturnValue([]);
  rerender(<MaterialClassification />);
  expect(
    screen.getByText(
      "Add catalogue definitions to review active scrap materials.",
    ),
  ).toBeVisible();
  expect(mocks.mutate).not.toHaveBeenCalled();
});

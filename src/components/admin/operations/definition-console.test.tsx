import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, it, vi } from "vitest";

import { DefinitionConsole } from "./definition-console";
const mock = vi.hoisted(() => ({ save: vi.fn() }));
vi.mock("convex/react", () => ({
  useMutation: () => mock.save,
  useQuery: () => [
    {
      id: "def-a",
      name: "Test material",
      grade: "Test grade",
      materialCode: "TEST",
      processingState: "Washed",
      version: "1",
      status: "draft",
      specification: "Test specification",
      sourceReference: "Test source",
    },
  ],
}));
beforeEach(() => {
  mock.save.mockReset().mockResolvedValue(null);
});
it("requires explicit review evidence before activation and keeps it after failure", async () => {
  const user = userEvent.setup();
  render(<DefinitionConsole />);
  const activate = screen.getByRole("button", { name: "Activate definition" });
  expect(activate).toBeDisabled();
  await user.type(
    screen.getByLabelText("Review evidence reference"),
    "REVIEW-TEST",
  );
  mock.save.mockRejectedValueOnce(new Error("offline"));
  await user.click(activate);
  expect(await screen.findByRole("alert")).toBeVisible();
  expect(screen.getByLabelText("Review evidence reference")).toHaveValue(
    "REVIEW-TEST",
  );
  expect(mock.save).toHaveBeenCalledWith({
    id: "def-a",
    decision: "active",
    reference: "REVIEW-TEST",
  });
});

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { StakeholderQueue } from "./stakeholder-queue";

const mocks = vi.hoisted(() => ({
  decide: vi.fn(),
  requests: [
    {
      id: "request-1",
      kind: "material_generator",
      siteType: "hotel",
      organizationName: "Lakeside Hotel",
      requestedAt: 1,
      applicantPhone: "+919000000301",
    },
  ],
}));

vi.mock("convex/react", () => ({
  useQuery: () => mocks.requests,
  useMutation: () => mocks.decide,
}));
vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

beforeEach(() => {
  mocks.decide.mockReset().mockResolvedValue(null);
});

describe("stakeholder review", () => {
  it("requires identity confirmation and a review note before approval", async () => {
    const user = userEvent.setup();
    render(<StakeholderQueue />);
    expect(screen.getByText("Lakeside Hotel")).toBeInTheDocument();
    const approve = screen.getByRole("button", { name: "Approve account" });
    expect(approve).toBeDisabled();

    await user.type(
      screen.getByRole("textbox", { name: /Review note/ }),
      "Verified identity and hotel affiliation",
    );
    expect(approve).toBeDisabled();
    await user.click(
      screen.getByRole("checkbox", {
        name: /checked this applicant/,
      }),
    );
    await user.click(approve);
    expect(mocks.decide).toHaveBeenCalledWith({
      id: "request-1",
      decision: "approve",
      reviewNote: "Verified identity and hotel affiliation",
    });
  });

  it("allows rejection with a reason without marking identity as verified", async () => {
    const user = userEvent.setup();
    render(<StakeholderQueue />);
    await user.type(
      screen.getByRole("textbox", { name: /Review note/ }),
      "Could not confirm organisation",
    );
    await user.click(screen.getByRole("button", { name: "Reject request" }));
    expect(mocks.decide).toHaveBeenCalledWith({
      id: "request-1",
      decision: "reject",
      reviewNote: "Could not confirm organisation",
    });
  });
});

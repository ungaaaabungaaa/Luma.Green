import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useMutation, usePaginatedQuery, useQuery } from "convex/react";
import { getFunctionName } from "convex/server";
import { NextIntlClientProvider } from "next-intl";
import type { ReactNode } from "react";
import { beforeEach, expect, it, vi } from "vitest";

import { fakeQueries, renderWithIntl } from "@/components/shop/test-helpers";

import type { Id } from "../../../convex/_generated/dataModel";
import en from "../../../messages/en.json";
import { LogisticsPage } from "./logistics-page";
import { PlanForm } from "./plan-form";

const state = vi.hoisted(() => ({ role: "owner", save: vi.fn() }));
vi.mock("convex/react", () => ({
  useQuery: vi.fn(),
  useMutation: vi.fn(),
  usePaginatedQuery: vi.fn(),
}));
vi.mock("@/components/app/use-workspace", () => ({
  useWorkspace: () => ({ kind: "org", org: { id: "org-a" }, role: state.role }),
}));
vi.mock("@/i18n/navigation", () => ({
  Link: ({ children }: { children: ReactNode }) => <span>{children}</span>,
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
beforeEach(() => {
  state.role = "owner";
  state.save.mockReset();
  vi.mocked(useMutation).mockReturnValue(
    state.save as unknown as ReturnType<typeof useMutation>,
  );
  vi.mocked(useQuery).mockImplementation(
    fakeQueries({ "routePlans:options": [] }) as unknown as typeof useQuery,
  );
  vi.mocked(usePaginatedQuery).mockReturnValue({
    results: [],
    status: "Exhausted",
    loadMore: vi.fn(),
    isLoading: false,
  });
});
it("shows a truthful empty manual workspace with no invented distance", () => {
  renderWithIntl(<LogisticsPage />);
  expect(screen.getByText(en.logistics.lead)).toBeVisible();
  expect(screen.getByText(en.logistics.empty)).toBeVisible();
  expect(screen.getByRole("button", { name: en.logistics.add })).toBeVisible();
});
it("keeps viewer access read only", () => {
  state.role = "viewer";
  renderWithIntl(<LogisticsPage />);
  expect(screen.getByText(en.lots.readOnly)).toBeVisible();
  expect(
    screen.queryByRole("button", { name: en.logistics.add }),
  ).not.toBeInTheDocument();
  expect(state.save).not.toHaveBeenCalled();
});
it("opens a labelled plan form and retains entered text when dismissed", async () => {
  renderWithIntl(<LogisticsPage />);
  await userEvent.click(screen.getByRole("button", { name: en.logistics.add }));
  await userEvent.type(
    screen.getByLabelText(en.logistics.titleLabel),
    "My route",
  );
  await userEvent.keyboard("{Escape}");
  await userEvent.click(screen.getByRole("button", { name: en.logistics.add }));
  expect(screen.getByLabelText(en.logistics.titleLabel)).toHaveValue(
    "My route",
  );
  expect(state.save).not.toHaveBeenCalled();
});

function savedPlan(revision: number) {
  return {
    _id: "plan-1" as Id<"routePlans">,
    _creationTime: 1,
    orgId: "org-a" as Id<"orgs">,
    reference: "PLAN-ONE",
    title: `Plan ${String(revision)}`,
    status: "active" as const,
    revision,
    createdAt: 1,
    updatedAt: revision,
  };
}
function planDetail(revision: number) {
  return {
    plan: savedPlan(revision),
    latest: {
      _id: "version-1" as Id<"routePlanVersions">,
      _creationTime: 1,
      planId: "plan-1" as Id<"routePlans">,
      orgId: "org-a" as Id<"orgs">,
      actorProfileId: "profile-1" as Id<"profiles">,
      revision,
      createdAt: 1,
      title: `Plan ${String(revision)}`,
      vehicleReference: "Vehicle test",
      capacityGrams: 1000,
      origin: { siteReference: "Start", latitude: 0, longitude: 0 },
      stops: [
        {
          siteReference: "End",
          latitude: 1,
          longitude: 1,
          materialId: "material-1" as Id<"materials">,
          grams: 1000,
        },
      ],
      ordering: "entered" as const,
      orderIndices: [0],
      materialCodes: ["PLASTIC-PET"],
      totalGrams: 1000,
      straightLineMeters: 157_250,
      reason: "Initial plan",
    },
  };
}
function translated(ui: ReactNode) {
  return (
    <NextIntlClientProvider locale="en" messages={en} timeZone="Asia/Kolkata">
      {ui}
    </NextIntlClientProvider>
  );
}
it("keeps the revision opened for correction when a newer revision arrives", async () => {
  vi.mocked(useQuery).mockImplementation(
    fakeQueries({
      "routePlans:options": [
        { id: "material-1", code: "PLASTIC-PET", names: { en: "PET" } },
      ],
    }) as unknown as typeof useQuery,
  );
  const view = renderWithIntl(<PlanForm detail={planDetail(1)} />);
  await userEvent.click(
    screen.getByRole("button", { name: en.logistics.correct }),
  );
  await userEvent.type(
    screen.getByLabelText(en.logistics.reason),
    "Correct vehicle plan",
  );
  view.rerender(translated(<PlanForm detail={planDetail(2)} />));
  expect(screen.getByLabelText(en.logistics.titleLabel)).toHaveValue("Plan 1");
  await userEvent.click(screen.getByRole("button", { name: en.lots.save }));
  await waitFor(() => {
    expect(state.save).toHaveBeenCalledWith(
      expect.objectContaining({ expectedRevision: 1, title: "Plan 1" }),
    );
  });
});
it("archives only the revision reviewed when the archive dialog opened", async () => {
  const queryResults = { "routePlans:detail": planDetail(1) };
  vi.mocked(useQuery).mockImplementation(
    fakeQueries(queryResults) as unknown as typeof useQuery,
  );
  vi.mocked(usePaginatedQuery).mockImplementation((query) => ({
    results: getFunctionName(query) === "routePlans:mine" ? [savedPlan(1)] : [],
    status: "Exhausted",
    loadMore: vi.fn(),
    isLoading: false,
  }));
  const view = renderWithIntl(<LogisticsPage />);
  await userEvent.click(
    screen.getByRole("button", { name: en.logistics.history }),
  );
  await userEvent.click(
    screen.getByRole("button", { name: en.logistics.archive }),
  );
  await userEvent.type(
    screen.getByLabelText(en.logistics.reason),
    "Archive reviewed plan",
  );
  queryResults["routePlans:detail"] = planDetail(2);
  view.rerender(translated(<LogisticsPage />));
  await userEvent.click(
    within(screen.getByRole("dialog")).getByRole("button", {
      name: en.logistics.archive,
    }),
  );
  await waitFor(() => {
    expect(state.save).toHaveBeenCalledWith(
      expect.objectContaining({ expectedRevision: 1 }),
    );
  });
});

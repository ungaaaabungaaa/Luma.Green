import { render, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import ar from "../../messages/ar.json";
import en from "../../messages/en.json";

const monitoring = vi.hoisted(() => ({ enabled: false }));
const sentry = vi.hoisted(() => ({ captureException: vi.fn() }));
vi.mock("@/lib/monitoring", () => ({
  isMonitoringEnabled: () => monitoring.enabled,
}));
vi.mock("@sentry/nextjs", () => sentry);

import GlobalError from "./global-error";

beforeEach(() => {
  monitoring.enabled = false;
  window.history.replaceState({}, "", "/");
});
afterEach(() => {
  vi.clearAllMocks();
});

function renderFailure(error: Error, retry = vi.fn()) {
  const container = document;
  return {
    ...render(<GlobalError error={error} retry={retry} />, { container }),
    retry,
  };
}

describe("root failure screen", () => {
  it("offers an accessible retry without monitoring or the normal providers", async () => {
    const view = renderFailure(new Error("Private error details"));
    expect(
      view.getByRole("heading", { level: 1, name: en.common.error }),
    ).toBeInTheDocument();
    await userEvent.click(view.getByRole("button", { name: en.common.retry }));
    expect(view.retry).toHaveBeenCalledOnce();
    expect(sentry.captureException).not.toHaveBeenCalled();
    expect(view.queryByText("Private error details")).not.toBeInTheDocument();
  });

  it("captures the failure only when the operator enables monitoring", async () => {
    monitoring.enabled = true;
    const error = new Error("Fixture root error");
    renderFailure(error);
    await waitFor(() => {
      expect(sentry.captureException).toHaveBeenCalledExactlyOnceWith(error);
    });
  });

  it("uses Arabic accessible controls and document direction without a locale provider", async () => {
    window.history.replaceState({}, "", "/ar/app");
    const view = renderFailure(new Error("Fixture Arabic root error"));
    expect(view.container.documentElement).toHaveAttribute("lang", "ar");
    expect(view.container.documentElement).toHaveAttribute("dir", "rtl");
    expect(
      view.getByRole("heading", { level: 1, name: ar.common.error }),
    ).toBeInTheDocument();
    await userEvent.click(view.getByRole("button", { name: ar.common.retry }));
    expect(view.retry).toHaveBeenCalledOnce();
    expect(sentry.captureException).not.toHaveBeenCalled();
  });

  it("keeps retry usable when optional reporting throws", async () => {
    monitoring.enabled = true;
    sentry.captureException.mockImplementationOnce(() => {
      throw new Error("Private provider details");
    });
    const logged = vi.spyOn(console, "error").mockImplementation(vi.fn());
    const view = renderFailure(new Error("Fixture failure"));
    await waitFor(() => {
      expect(logged).toHaveBeenCalledWith("Error reporting is unavailable.");
    });
    await userEvent.click(view.getByRole("button", { name: en.common.retry }));
    expect(view.retry).toHaveBeenCalledOnce();
    expect(
      view.queryByText("Private provider details"),
    ).not.toBeInTheDocument();
    logged.mockRestore();
  });
});

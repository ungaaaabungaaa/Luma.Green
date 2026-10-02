import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import type { ComponentProps } from "react";
import { toast } from "sonner";
import { beforeEach, describe, expect, it, vi } from "vitest";

import messages from "../../../messages/en.json";
import { StatusView } from "./status-view";

const discard = vi.hoisted(() => vi.fn());
vi.mock("convex/react", () => ({ useMutation: () => discard }));
vi.mock("sonner", () => ({ toast: { error: vi.fn() } }));
vi.mock("./use-mine", () => ({
  useMine: () => ({
    application: { kind: "kabadiwala", status: "draft", version: 0 },
  }),
}));
vi.mock("@/i18n/navigation", () => ({
  Link: (props: ComponentProps<"a">) => <a {...props} />,
  useRouter: () => ({ replace: vi.fn() }),
}));
beforeEach(() => {
  vi.resetAllMocks();
});

describe("discarding an application draft", () => {
  it("keeps the confirmation and draft after failure so the applicant can retry", async () => {
    discard.mockRejectedValueOnce(new Error("Private server details"));
    discard.mockResolvedValueOnce(null);
    render(
      <NextIntlClientProvider locale="en" messages={messages}>
        <StatusView />
      </NextIntlClientProvider>,
    );
    fireEvent.click(
      screen.getByRole("button", {
        name: messages.join.status.draft.changeRole,
      }),
    );
    fireEvent.click(
      screen.getByRole("button", { name: messages.join.form.yes }),
    );
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledExactlyOnceWith(
        messages.common.error,
      );
    });
    expect(screen.getByRole("alertdialog")).toBeVisible();
    expect(
      screen.getByRole("button", { name: messages.join.form.yes }),
    ).toBeEnabled();
    fireEvent.click(
      screen.getByRole("button", { name: messages.join.form.yes }),
    );
    await waitFor(() => {
      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    });
    expect(discard).toHaveBeenCalledTimes(2);
  });
});

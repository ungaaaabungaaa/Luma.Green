import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { toast } from "sonner";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { Id } from "../../../convex/_generated/dataModel";
import messages from "../../../messages/en.json";
import { FileSlot } from "./file-slot";
import type { FileSummary } from "./use-mine";

const { prepare, generateUrl, attach } = vi.hoisted(() => ({
  prepare: vi.fn(),
  generateUrl: vi.fn(),
  attach: vi.fn(),
}));
vi.mock("@/lib/upload-image", () => ({ prepareUpload: prepare }));
vi.mock("sonner", () => ({ toast: { error: vi.fn() } }));
vi.mock("convex/react", () => ({
  useMutation: () => generateUrl,
  useAction: () => attach,
}));

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

function renderSlot(files: FileSummary[] = []) {
  render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <FileSlot
        type="id_proof"
        files={files}
        label="Photo ID"
        hint="Choose your ID"
      />
    </NextIntlClientProvider>,
  );
  return document.querySelector<HTMLInputElement>('input[type="file"]');
}

describe("document uploads", () => {
  it("keeps an attachment visible and restores remove after a failed deletion", async () => {
    generateUrl.mockRejectedValueOnce(new Error("Private storage failure"));
    renderSlot([
      {
        id: "fixture-file" as Id<"applicationFiles">,
        type: "id_proof",
        name: "fixture.pdf",
        size: 123,
        contentType: "application/pdf",
      },
    ]);
    const remove = screen.getByRole("button", {
      name: `${messages.join.files.remove}: fixture.pdf`,
    });
    fireEvent.click(remove);
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledExactlyOnceWith(
        messages.common.error,
      );
    });
    expect(screen.getByText("fixture.pdf")).toBeVisible();
    expect(remove).toBeEnabled();
  });
  it("uploads the prepared bytes and correct content type and name", async () => {
    const original = new File(["original"], "id.png", { type: "image/png" });
    const smaller = new File(["small"], "id.jpg", { type: "image/jpeg" });
    prepare.mockResolvedValue(smaller);
    generateUrl.mockResolvedValue("https://storage.example/upload");
    attach.mockResolvedValue({ ok: true });
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ storageId: "stored" }),
    });
    vi.stubGlobal("fetch", fetchMock);
    const input = renderSlot();
    if (!input) throw new Error("File input missing");
    fireEvent.change(input, { target: { files: [original] } });
    await waitFor(() => {
      expect(attach).toHaveBeenCalledWith({
        storageId: "stored",
        type: "id_proof",
        name: "id.jpg",
      });
    });
    expect(fetchMock).toHaveBeenCalledWith("https://storage.example/upload", {
      method: "POST",
      headers: { "Content-Type": "image/jpeg" },
      body: smaller,
    });
  });
  it("shows the existing translated error without requesting an upload URL when preparation fails", async () => {
    prepare.mockRejectedValue(new Error("Invalid image"));
    const input = renderSlot();
    if (!input) throw new Error("File input missing");
    fireEvent.change(input, {
      target: {
        files: [new File(["invalid"], "id.png", { type: "image/png" })],
      },
    });
    await waitFor(() => {
      expect(screen.getByText(messages.join.errors.uploadFailed)).toBeVisible();
    });
    expect(generateUrl).not.toHaveBeenCalled();
  });
});

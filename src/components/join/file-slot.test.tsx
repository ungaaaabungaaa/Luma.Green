import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, describe, expect, it, vi } from "vitest";

import messages from "../../../messages/en.json";
import { FileSlot } from "./file-slot";

const { prepare, generateUrl, attach } = vi.hoisted(() => ({
  prepare: vi.fn(),
  generateUrl: vi.fn(),
  attach: vi.fn(),
}));
vi.mock("@/lib/upload-image", () => ({ prepareUpload: prepare }));
vi.mock("convex/react", () => ({
  useMutation: () => generateUrl,
  useAction: () => attach,
}));

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

function renderSlot() {
  render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <FileSlot
        type="id_proof"
        files={[]}
        label="Photo ID"
        hint="Choose your ID"
      />
    </NextIntlClientProvider>,
  );
  return document.querySelector<HTMLInputElement>('input[type="file"]');
}

describe("document uploads", () => {
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

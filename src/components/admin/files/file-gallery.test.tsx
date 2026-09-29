import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import { FileGallery, type FileSummary, previewFor } from "./file-gallery";
import type * as PrivateFile from "./private-file";
import { fetchPrivateFile, PrivateFileError } from "./private-file";

vi.mock("./private-file", async (importOriginal) => ({
  ...(await importOriginal<typeof PrivateFile>()),
  fetchPrivateFile: vi.fn(),
}));

const fetchFile = vi.mocked(fetchPrivateFile);

// jsdom has no object URLs; the gallery only needs one to point at.
beforeAll(() => {
  Object.defineProperties(URL, {
    createObjectURL: {
      configurable: true,
      value: vi.fn(() => "blob:private-file"),
    },
    revokeObjectURL: { configurable: true, value: vi.fn() },
  });
});

afterAll(() => {
  Reflect.deleteProperty(URL, "createObjectURL");
  Reflect.deleteProperty(URL, "revokeObjectURL");
});

beforeEach(() => {
  fetchFile.mockReset();
});

function renderGallery(files: FileSummary[]) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <FileGallery files={files} emptyText="No files attached." />
    </QueryClientProvider>,
  );
}

const photoId: FileSummary = {
  id: "f1",
  type: "id_proof",
  name: "voter-id.jpg",
  contentType: "image/jpeg",
  size: 820 * 1024,
};

const video: FileSummary = {
  id: "f2",
  type: "machine_media",
  name: "shredder.mp4",
  contentType: "video/mp4",
  size: 18 * 1024 * 1024,
};

describe("previewFor", () => {
  it("shows images and PDFs inline, and plays videos", () => {
    expect(previewFor("image/webp")).toBe("image");
    expect(previewFor("image/svg+xml")).toBe("image");
    expect(previewFor("application/pdf")).toBe("pdf");
    expect(previewFor("video/quicktime")).toBe("video");
    expect(previewFor("text/plain")).toBe("none");
  });
});

describe("FileGallery", () => {
  it("shows a photo once the private route hands it over", async () => {
    fetchFile.mockResolvedValue(new Blob(["jpeg"], { type: "image/jpeg" }));
    renderGallery([photoId]);
    const image = await screen.findByRole("img", {
      name: "Photo ID: voter-id.jpg",
    });
    expect(image).toHaveAttribute("src", "blob:private-file");
    expect(fetchFile).toHaveBeenCalledWith(
      photoId,
      expect.objectContaining({ fetch: expect.any(Function) as unknown }),
    );
    expect(
      screen.getByRole("button", { name: "Download voter-id.jpg" }),
    ).toBeInTheDocument();
  });

  it("loads a video only when asked", async () => {
    fetchFile.mockResolvedValue(new Blob(["mp4"], { type: "video/mp4" }));
    const user = userEvent.setup();
    renderGallery([video]);
    expect(fetchFile).not.toHaveBeenCalled();
    await user.click(
      screen.getByRole("button", { name: "Load the video (18 MB)" }),
    );
    expect(
      await screen.findByLabelText("Machine photo or video: shredder.mp4"),
    ).toHaveAttribute("src", "blob:private-file");
  });

  it("explains a refusal and offers another try", async () => {
    fetchFile.mockRejectedValue(new PrivateFileError("forbidden"));
    renderGallery([photoId]);
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Only the applicant and the admin can open this file.",
    );
    expect(
      screen.getByRole("button", { name: "Try again" }),
    ).toBeInTheDocument();
  });

  it("says when there's nothing to show", () => {
    renderGallery([]);
    expect(screen.getByText("No files attached.")).toBeInTheDocument();
  });
});

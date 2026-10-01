import { webcrypto } from "node:crypto";

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

import messages from "../../../messages/en.json";
import { PhotoEstimate } from "./photo-estimate";

const session = vi.hoisted((): { userId?: string } => ({}));
vi.mock("@/lib/auth-client", () => ({
  authClient: {
    useSession: () => ({
      data: session.userId ? { user: { id: session.userId } } : null,
    }),
  },
}));

const estimate = vi.hoisted(() => vi.fn());
const availability = vi.hoisted(
  (): { value: boolean | undefined; fails: boolean } => ({
    value: true,
    fails: false,
  }),
);
vi.mock("convex/react", () => ({
  useAction: () => estimate,
  useQuery: () => {
    if (availability.fails) throw new Error("unavailable");
    return availability.value;
  },
}));
vi.mock("./photo-image", () => ({
  preparePhoto: () => Promise.resolve("data:image/jpeg;base64,prepared"),
  photoDeviceId: () => "device",
}));
const materials = [
  {
    code: "PAPER-NEWS",
    family: "paper" as const,
    stage: "scrap" as const,
    names: { en: "Newspaper" },
    co2eFactor: 1,
  },
];
const result = {
  items: [
    {
      materialCode: "PAPER-NEWS",
      gramsLow: 500,
      gramsHigh: 1500,
      confidence: 0.8,
    },
  ],
  retake: "none",
};
beforeEach(() => {
  vi.stubGlobal("crypto", webcrypto);
  session.userId = undefined;
  estimate.mockReset();
  availability.value = true;
  availability.fails = false;
});
afterEach(() => {
  vi.unstubAllGlobals();
});
function show() {
  const apply = vi.fn();
  render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <PhotoEstimate
        materials={materials}
        prices={new Map([["PAPER-NEWS", 1000]])}
        onApply={apply}
      />
    </NextIntlClientProvider>,
  );
  return apply;
}
async function submit() {
  const user = userEvent.setup();
  await user.upload(
    screen.getByLabelText("Choose or take a photo"),
    new File(["image"], "scrap.jpg", { type: "image/jpeg" }),
  );
  await user.click(
    await screen.findByRole("button", { name: "Estimate this photo" }),
  );
  return user;
}
it("requires review before replacing the basket and uses the table price", async () => {
  estimate.mockResolvedValue({ status: "ok", result });
  const apply = show();
  const user = await submit();
  expect(await screen.findByText("Newspaper")).toBeVisible();
  expect(screen.getByText(/Estimated value:/)).toHaveTextContent("₹5");
  expect(apply).not.toHaveBeenCalled();
  await user.click(screen.getByRole("button", { name: "Use these items" }));
  expect(apply).toHaveBeenCalledWith([{ materialCode: "PAPER-NEWS", kg: 1 }]);
  expect(screen.getByRole("status")).toHaveTextContent("Suggestions added");
});
it.each(["unavailable", "failed", "limited", "invalid"])(
  "preserves manual entry when the provider returns %s",
  async (status) => {
    estimate.mockResolvedValue({ status });
    const apply = show();
    const user = await submit();
    expect(
      await screen.findByRole("button", { name: "Choose items manually" }),
    ).toBeEnabled();
    await user.click(
      screen.getByRole("button", { name: "Choose items manually" }),
    );
    expect(apply).not.toHaveBeenCalled();
    expect(
      screen.queryByRole("button", { name: "Use these items" }),
    ).not.toBeInTheDocument();
  },
);
it("offers a retake when there is no usable estimate", async () => {
  estimate.mockResolvedValue({
    status: "ok",
    result: { items: [], retake: "too_dark" },
  });
  show();
  await submit();
  expect(await screen.findByRole("status")).toHaveTextContent(
    "The photo is unclear",
  );
  expect(screen.getByLabelText("Choose another photo")).toBeEnabled();
});

it.each([false, undefined])(
  "does not request a photo when configuration is disabled or loading (%s)",
  (value) => {
    availability.value = value;
    show();
    expect(
      screen.queryByRole("heading", { name: "Try a photo estimate" }),
    ).not.toBeInTheDocument();
    expect(estimate).not.toHaveBeenCalled();
  },
);
it("contains optional query errors inside the photo card", () => {
  availability.fails = true;
  const errors = vi.spyOn(console, "error").mockImplementation(() => {
    /* React reports the query error handled by the boundary. */
  });
  try {
    show();
    expect(
      screen.queryByRole("heading", { name: "Try a photo estimate" }),
    ).not.toBeInTheDocument();
  } finally {
    errors.mockRestore();
  }
});
it("starts only one paid action for rapid repeated clicks", async () => {
  estimate.mockReturnValue(
    new Promise(() => {
      /* Keep the action pending for the duplicate-click check. */
    }),
  );
  show();
  const user = userEvent.setup();
  await user.upload(
    screen.getByLabelText("Choose or take a photo"),
    new File(["image"], "scrap.jpg", { type: "image/jpeg" }),
  );
  await user.dblClick(
    await screen.findByRole("button", { name: "Estimate this photo" }),
  );
  expect(estimate).toHaveBeenCalledTimes(1);
});

it.each([
  { gramsLow: 100, gramsHigh: 198, kg: 0.1 },
  { gramsLow: 100, gramsHigh: 200, kg: 0.2 },
])(
  "applies the midpoint at the basket's 100-gram precision ($gramsLow–$gramsHigh)",
  async ({ gramsLow, gramsHigh, kg }) => {
    estimate.mockResolvedValue({
      status: "ok",
      result: {
        items: [
          { materialCode: "PAPER-NEWS", gramsLow, gramsHigh, confidence: 0.8 },
        ],
        retake: "none",
      },
    });
    const apply = show();
    const user = await submit();
    await user.click(
      await screen.findByRole("button", { name: "Use these items" }),
    );
    expect(apply).toHaveBeenCalledWith([{ materialCode: "PAPER-NEWS", kg }]);
  },
);

it("reuses a successful estimate when the same image is selected again", async () => {
  estimate.mockResolvedValue({ status: "ok", result });
  show();
  const user = await submit();
  await screen.findByText("Newspaper");
  await user.upload(
    screen.getByLabelText("Choose another photo"),
    new File(["image"], "again.jpg", { type: "image/jpeg" }),
  );
  await user.click(
    await screen.findByRole("button", { name: "Estimate this photo" }),
  );
  await screen.findByText("Newspaper");
  expect(estimate).toHaveBeenCalledTimes(1);
});

it("does not reuse a previous account's result", async () => {
  estimate.mockResolvedValue({ status: "ok", result });
  const apply = vi.fn();
  const view = () => (
    <NextIntlClientProvider locale="en" messages={messages}>
      <PhotoEstimate materials={materials} prices={new Map()} onApply={apply} />
    </NextIntlClientProvider>
  );
  const { rerender } = render(view());
  await submit();
  await screen.findByText("Newspaper");
  session.userId = "another-user";
  rerender(view());
  expect(screen.queryByText("Newspaper")).not.toBeInTheDocument();
  await submit();
  await screen.findByText("Newspaper");
  expect(estimate).toHaveBeenCalledTimes(2);
});

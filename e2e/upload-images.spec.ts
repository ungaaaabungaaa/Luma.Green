import { expect, test } from "@playwright/test";
import { build } from "vite";

// Exercise the real browser codec and production helper without an authenticated
// upload or a test-only app route. Component tests cover the storage hand-off.
const bundle = { code: "" };

test.beforeAll(async () => {
  const result = await build({
    configFile: false,
    logLevel: "error",
    build: {
      write: false,
      minify: false,
      lib: {
        entry: "src/lib/upload-image.ts",
        name: "LumaUpload",
        formats: ["iife"],
      },
    },
  });
  const outputs = Array.isArray(result) ? result : [result];
  for (const output of outputs) {
    if (!("output" in output)) continue;
    for (const chunk of output.output)
      if (chunk.type === "chunk") bundle.code += chunk.code;
  }
});

test("compresses a high-resolution scan locally and keeps its text legible", async ({
  page,
}, testInfo) => {
  await page.setContent('<html lang="en"><body></body></html>');
  await page.addScriptTag({ content: bundle.code });
  const result = await page.evaluate(async () => {
    const { prepareUpload } = (
      globalThis as unknown as {
        LumaUpload: {
          prepareUpload: (file: File, type: "id_proof") => Promise<File>;
        };
      }
    ).LumaUpload;
    const canvas = document.createElement("canvas");
    canvas.width = 4000;
    canvas.height = 3000;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas unavailable");
    context.fillStyle = "white";
    context.fillRect(0, 0, 4000, 3000);
    context.fillStyle = "black";
    context.font = "64px sans-serif";
    for (let row = 0; row < 32; row++)
      context.fillText(
        `Sample document ${String(row)} — ID 1234 5678 9000`,
        100,
        150 + row * 80,
      );
    const gradient = context.createLinearGradient(0, 0, 4000, 3000);
    gradient.addColorStop(0, "rgba(0, 128, 0, 0.1)");
    gradient.addColorStop(1, "rgba(0, 0, 128, 0.1)");
    context.fillStyle = gradient;
    context.fillRect(0, 0, 4000, 3000);
    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, "image/png");
    });
    if (!blob) throw new Error("Fixture encoder unavailable");
    const source = new File([blob], "document.png", { type: "image/png" });
    const output = await prepareUpload(source, "id_proof");
    const decoded = await createImageBitmap(output);
    const image = document.createElement("img");
    image.src = URL.createObjectURL(output);
    image.width = 1000;
    image.alt = "Compressed document fixture";
    document.body.append(image);
    const sizes = {
      before: source.size,
      after: output.size,
      width: decoded.width,
      height: decoded.height,
      type: output.type,
      name: output.name,
    };
    decoded.close();
    return sizes;
  });
  expect(result.after).toBeLessThan(result.before * 0.7);
  expect(result.width).toBe(2400);
  expect(result.height).toBe(1800);
  expect(result.type).toBe("image/jpeg");
  expect(result.name).toBe("document.jpg");
  await expect(
    page.getByRole("img", { name: "Compressed document fixture" }),
  ).toBeVisible();
  await testInfo.attach("upload-byte-measurement", {
    body: JSON.stringify(result),
    contentType: "application/json",
  });
  await testInfo.attach("compressed-document", {
    body: await page.screenshot(),
    contentType: "image/png",
  });
});

test("rejects a malformed image before any network request", async ({
  page,
}) => {
  await page.setContent('<html lang="ar" dir="rtl"><body></body></html>');
  await page.addScriptTag({ content: bundle.code });
  const requests: string[] = [];
  page.on("request", (request) => {
    requests.push(request.url());
  });
  const isFailed = await page.evaluate(async () => {
    const { prepareUpload } = (
      globalThis as unknown as {
        LumaUpload: {
          prepareUpload: (file: File, type: "selfie") => Promise<File>;
        };
      }
    ).LumaUpload;
    try {
      await prepareUpload(
        new File([new Uint8Array([255, 216, 255, 225, 255, 255])], "bad.jpg", {
          type: "image/jpeg",
        }),
        "selfie",
      );
      return false;
    } catch {
      return true;
    }
  });
  expect(isFailed).toBe(true);
  expect(requests).toEqual([]);
});

test("keeps an already small PNG upright when its lossless fallback wins", async ({
  page,
}) => {
  await page.setContent("<html><body></body></html>");
  await page.addScriptTag({ content: bundle.code });
  const result = await page.evaluate(async () => {
    const { prepareUpload } = (
      globalThis as unknown as {
        LumaUpload: {
          prepareUpload: (file: File, type: "id_proof") => Promise<File>;
        };
      }
    ).LumaUpload;
    const bytes = Uint8Array.from(
      atob(
        "iVBORw0KGgoAAAANSUhEUgAAAAQAAAACCAIAAADwyuo0AAABP2lDQ1BpY2MAABiVfZC/SwJxGMY/11WWWA05NBQcJU0FUUtTgYZOEfgj1Kbz/FGgdt33QprLoaloiEZrCaLZxhz6A4KgIQqirdWghpKLrw5aUM/yfnh4Xt6XB5TnvFEQ3RoUirYVDvm1eCKpuV5Q8dLPIGO6IczlSDAKIPSSMGwrzw+936PIeTe9rhfTO6/Xq8kFpbo7UY4FP1Yu+F/udEYYwBfgM0zLBkUDxku2KXkJ8BrrehqUODBlxRNJUPakn2vxieRUiy8lW9FwAJQaoOU6ONXBhfy2vCslv/dkirEI0AeMIggTwv9HpreZCRBgBmRfv3sQ2bnZ1pZnEXqeHOdtElyH0DhynM9Tx2mcgfoIta32/mYF5uugHrS91DFc7cPIQ9vzVWCoDNUbU7f0pqUCXdkNqJ/DQAKGb8G99g3j4l+x2lMbhgAAALRlWElmSUkqAAgAAAAGABIBAwABAAAABgAAABoBBQABAAAAVgAAABsBBQABAAAAXgAAACgBAwABAAAAAgAAABMCAwABAAAAAQAAAGmHBAABAAAAZgAAAAAAAAA4YwAA6AMAADhjAADoAwAABgAAkAcABAAAADAyMTABkQcABAAAAAECAwAAoAcABAAAADAxMDABoAMAAQAAAP//AAACoAQAAQAAAAQAAAADoAQAAQAAAAIAAAAAAAAAbZ57xwAAAAlwSFlzAAAD6AAAA+gBtXtSawAAABBJREFUCJljaOAxgiMGZA4AT7oF8Wbrm3oAAAAASUVORK5CYII=",
      ),
      (character) => character.codePointAt(0) ?? 0,
    );
    const source = new File([bytes], "oriented.png", { type: "image/png" });
    const output = await prepareUpload(source, "id_proof");
    const before = await createImageBitmap(source);
    const after = await createImageBitmap(output);
    const result = {
      beforeWidth: before.width,
      beforeHeight: before.height,
      afterWidth: after.width,
      afterHeight: after.height,
      sourceBytes: source.size,
      outputBytes: output.size,
      type: output.type,
    };
    before.close();
    after.close();
    return result;
  });
  expect(result.beforeWidth).toBe(2);
  expect(result.beforeHeight).toBe(4);
  expect(result.afterWidth).toBe(result.beforeWidth);
  expect(result.afterHeight).toBe(result.beforeHeight);
  expect(result.outputBytes).toBeLessThan(result.sourceBytes);
  expect(result.type).toBe("image/png");
});

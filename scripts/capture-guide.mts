/** Capture real, disconnected public pages for the maintained user guide. */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";

import { chromium } from "@playwright/test";

const origin = new URL(process.env.GUIDE_BASE_URL ?? "http://localhost:3004");
if (!["localhost", "127.0.0.1"].includes(origin.hostname)) {
  throw new Error(
    "Use a local documentation preview, without real customer data.",
  );
}
const directory = "docs/user-guide/screenshots";
const shots = [
  ["public-home", "/"],
  ["public-home-dark", "/"],
  ["public-participants", "/participants"],
  ["public-participants-dark", "/participants"],
  ["public-arabic-dark", "/ar"],
  ["public-prices", "/prices"],
  ["public-sell", "/sell"],
  ["public-join", "/join"],
  ["public-login", "/login"],
  ["public-admin-login", "/admin/login"],
  ["public-admin-setup", "/admin/setup"],
  ["public-help", "/help"],
  ["public-standards", "/standards"],
  ["public-solar", "/solar"],
  ["public-contact", "/help/contact"],
  ["public-contact-info", "/contact"],
  ["public-how-it-works", "/how-it-works"],
  ["public-arabic", "/ar"],
] as const;
await mkdir(directory, { recursive: true });
// eslint-disable-next-line sonarjs/no-os-command-from-path -- invoke the developer-installed Git only for read-only capture provenance.
const revision = execFileSync("git", ["rev-parse", "HEAD"], {
  encoding: "utf8",
}).trim();
const browser = await chromium.launch();
const captures = [];
try {
  for (const [name, route] of shots) {
    const page = await browser.newPage({
      viewport: name.startsWith("public-arabic")
        ? { width: 390, height: 844 }
        : { width: 1280, height: 900 },
      reducedMotion: "reduce",
      locale: "en-IN",
      colorScheme: name.endsWith("-dark") ? "dark" : "light",
    });
    const browserErrors: string[] = [];
    const blockedRequests: string[] = [];
    page.on("pageerror", (error) => {
      browserErrors.push(error.message);
    });
    await page.route("**/*", async (route) => {
      if (new URL(route.request().url()).origin === origin.origin) {
        await route.continue();
      } else {
        blockedRequests.push(new URL(route.request().url()).origin);
        await route.abort();
      }
    });
    try {
      const url = new URL(route, origin).href;
      const response = await page.goto(url);
      if (!response?.ok())
        throw new Error(
          `Cannot capture ${route}: ${String(response?.status() ?? "no response")}`,
        );
      await page.getByRole("heading", { level: 1 }).waitFor();
      if (route === "/help/contact") {
        // Wait for the disconnected client state, not its Suspense skeleton.
        await page
          .locator('section[aria-labelledby="contact-form-heading"]')
          .getByRole("status")
          .waitFor();
      }
      await page.evaluate(async () => {
        await document.fonts.ready;
        await Promise.all(
          [...document.images].map(async (image) => {
            const bounds = image.getBoundingClientRect();
            if (
              image.currentSrc &&
              bounds.top < window.innerHeight &&
              bounds.bottom > 0
            )
              await image.decode();
          }),
        );
      });
      const path = `${directory}/${name}.png`;
      await page.screenshot({ path, animations: "disabled", caret: "hide" });
      if (browserErrors.length > 0 || blockedRequests.length > 0) {
        throw new Error(
          `Capture ${route} had browser errors or external traffic`,
        );
      }
      captures.push({
        browserErrors,
        blockedRequests,
        name,
        route,
        path,
        url,
        revision,
        capturedAt: new Date().toISOString(),
        kind: "current-local-disconnected",
        sha256: createHash("sha256")
          .update(await readFile(path))
          .digest("hex"),
      });
      process.stdout.write(`Captured ${route}\n`);
    } finally {
      await page.close();
    }
  }
} finally {
  await browser.close();
}
await writeFile(
  "docs/user-guide/public-captures.json",
  `${JSON.stringify(captures, null, 2)}\n`,
);

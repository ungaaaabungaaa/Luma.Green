import assert from "node:assert/strict";
import { mkdir, mkdtemp, realpath, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import { fileURLToPath } from "node:url";

import { _electron as electron } from "@playwright/test";

const directory = new URL("../release/demo/", import.meta.url);
const macDirectory = process.arch === "arm64" ? "mac-arm64" : "mac";
const executablePath =
  process.platform === "darwin"
    ? `${macDirectory}/Luma.Green Demo.app/Contents/MacOS/Luma.Green Demo`
    : "win-unpacked/Luma.Green Demo.exe";
const executable = new URL(executablePath, directory);
const userData = await mkdtemp(`${os.tmpdir()}/luma-packaged-demo-`);
const screenshots = new URL("evidence/", directory);
await mkdir(screenshots, { recursive: true });
const application = await electron.launch({
  executablePath: fileURLToPath(executable),
  args: [`--user-data-dir=${userData}`],
});
try {
  assert.equal(await application.evaluate(({ app }) => app.isPackaged), true);
  assert.equal(
    await application.evaluate(({ app }) => app.getPath("userData")),
    await realpath(userData),
  );
  const page = await application.firstWindow();
  await page.waitForURL(/^http:\/\/(localhost|127\.0\.0\.1|\[::1\]):\d+/u);
  const origin = new URL(page.url()).origin;
  await page.goto(`${origin}/participants`);
  await page.locator("h1").waitFor();
  assert.equal(
    await page.evaluate(() => typeof Reflect.get(window, "require")),
    "undefined",
  );
  assert.equal(
    await page.evaluate(() => typeof Reflect.get(window, "process")),
    "undefined",
  );
  await page.evaluate(() => window.open("file:///etc/passwd"));
  assert.equal(application.windows().length, 1);
  await page.screenshot({
    path: fileURLToPath(new URL("participants.png", screenshots)),
  });
  await page.goto(`${origin}/ar/participants`);
  await page.locator("h1").waitFor();
  assert.equal(await page.locator("html").getAttribute("dir"), "rtl");
  await page.screenshot({
    path: fileURLToPath(new URL("participants-arabic.png", screenshots)),
  });
  await writeFile(
    new URL("smoke.json", screenshots),
    `${JSON.stringify(
      {
        platform: process.platform,
        architecture: process.arch,
        packaged: true,
        origin,
        publicRoutes: ["/participants", "/ar/participants"],
        sandboxNodeIsolation: true,
        blockedFilePopup: true,
        authenticatedWorkflowsTested: false,
        signedReleaseTested: false,
        capturedAt: new Date().toISOString(),
      },
      null,
      2,
    )}\n`,
  );
  console.warn(
    "Packaged desktop demo passed: public role pages, Arabic RTL, Node isolation and blocked file popup.",
  );
} finally {
  await application.close();
  await rm(userData, { recursive: true, force: true });
}

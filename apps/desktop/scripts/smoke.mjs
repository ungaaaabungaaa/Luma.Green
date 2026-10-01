import assert from "node:assert/strict";
import { mkdtemp, realpath, rm } from "node:fs/promises";
import http from "node:http";
import os from "node:os";
import { fileURLToPath } from "node:url";

import { _electron as electron, expect } from "@playwright/test";

const directory = fileURLToPath(new URL("../", import.meta.url));
const userData = await mkdtemp(`${os.tmpdir()}/luma-desktop-smoke-`);
const server = http.createServer((_request, response) => {
  response.setHeader("content-type", "text/html");
  response.end(
    "<!doctype html><html><body><h1>Desktop fixture</h1><a href=\"/ar\">Arabic</a><a href=\"javascript:window.open('file:///etc/passwd')\">Blocked popup</a><button onclick=\"window.open(window.URL.createObjectURL(new Blob([atob('JVBERi0xLjQKMSAwIG9iago8PCAvVHlwZSAvQ2F0YWxvZyAvUGFnZXMgMiAwIFIgPj4KZW5kb2JqCjIgMCBvYmoKPDwgL1R5cGUgL1BhZ2VzIC9Db3VudCAxIC9LaWRzIFszIDAgUl0gPj4KZW5kb2JqCjMgMCBvYmoKPDwgL1R5cGUgL1BhZ2UgL1BhcmVudCAyIDAgUiAvTWVkaWFCb3ggWzAgMCAyMDAgMjAwXSAvQ29udGVudHMgNCAwIFIgPj4KZW5kb2JqCjQgMCBvYmoKPDwgL0xlbmd0aCAwID4+CnN0cmVhbQoKZW5kc3RyZWFtCmVuZG9iagp4cmVmCjAgNQowMDAwMDAwMDAwIDY1NTM1IGYgCjAwMDAwMDAwMDkgMDAwMDAgbiAKMDAwMDAwMDA1OCAwMDAwMCBuIAowMDAwMDAwMTE1IDAwMDAwIG4gCjAwMDAwMDAyMDIgMDAwMDAgbiAKdHJhaWxlcgo8PCAvU2l6ZSA1IC9Sb290IDEgMCBSID4+CnN0YXJ0eHJlZgoyNTEKJSVFT0YK')], {type: 'application/pdf'})), '_blank', 'noopener,noreferrer')\">Document</button></body></html>",
  );
});
await new Promise((resolve, reject) => {
  server.once("error", reject);
  server.listen(0, "127.0.0.1", () => resolve(true));
});
const address = server.address();
assert.ok(address && typeof address !== "string");
const origin = `http://127.0.0.1:${address.port}`;
const application = await electron.launch({
  args: [directory, `--user-data-dir=${userData}`],
  env: { ...process.env, DESKTOP_DEV_ORIGIN: origin },
});
application.process().stderr?.on("data", (chunk) => {
  process.stderr.write(chunk);
});
try {
  assert.equal(
    await application.evaluate(({ app }) => app.getPath("userData")),
    await realpath(userData),
  );
  const page = await application.firstWindow();
  page.on("pageerror", (error) => {
    console.error(error);
  });
  await page.getByRole("heading", { name: "Desktop fixture" }).waitFor();
  assert.equal(
    await page.evaluate(() => typeof Reflect.get(window, "require")),
    "undefined",
  );
  assert.equal(
    await page.evaluate(() => typeof Reflect.get(window, "process")),
    "undefined",
  );
  await page.getByRole("link", { name: "Blocked popup" }).click();
  assert.equal(application.windows().length, 1);
  const popupPromise = application.waitForEvent("window");
  await page.getByRole("button", { name: "Document" }).click();
  const popup = await popupPromise;
  await popup.waitForURL(/^blob:/u);
  // eslint-disable-next-line sonarjs/assertions-in-test-cases -- This executable is the Electron end-to-end smoke test.
  await expect
    .poll(() =>
      popup
        .frames()
        .some((frame) =>
          frame
            .url()
            .startsWith("chrome-extension://mhjfbmdgcfjbbpaeojofohoefgiehjai/"),
        ),
    )
    .toBe(true);
  assert.equal(
    await popup.evaluate(() => typeof Reflect.get(window, "require")),
    "undefined",
  );
  await popup.close();
  await page.getByRole("link", { name: "Arabic" }).click();
  await page.waitForURL(`${origin}/ar`);
  await new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) reject(error);
      else resolve(true);
    });
  });
  try {
    await page.reload();
  } catch (error) {
    assert.ok(error instanceof Error);
  }
  await page.getByRole("link").waitFor();
  assert.equal(await page.locator("html").getAttribute("dir"), "rtl");
  assert.match(page.url(), /^data:/u);
  await new Promise((resolve) => {
    server.listen(address.port, "127.0.0.1", () => resolve(true));
  });
  await page.getByRole("link").click();
  await page.getByRole("heading", { name: "Desktop fixture" }).waitFor();
  assert.equal(page.url(), `${origin}/ar`);
  console.warn(
    "Desktop smoke passed: sandbox, blocked popup, blob preview, Arabic offline screen and retry.",
  );
} finally {
  await application.close();
  server.close();
  await rm(userData, { recursive: true, force: true });
}

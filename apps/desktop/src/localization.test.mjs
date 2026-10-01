import assert from "node:assert/strict";
import test from "node:test";

import { offlineHtml, pageLocale, selectLocale } from "./localization.mjs";
const message = {
  brand: { name: "Luma.Green" },
  common: { retry: "Retry", error: "Error", close: "Close" },
  nav: { home: "Home" },
  native: { offlineTitle: "<Offline>", offlineBody: 'Try "again"' },
};
const catalogues = { en: message, ar: message };
test("OS language selects installed locale; admin is English", () => {
  assert.equal(selectLocale("ar-SA", catalogues), "ar");
  assert.equal(selectLocale("unknown", catalogues), "en");
  assert.equal(
    pageLocale("https://app.luma.green/ar/join", catalogues, "en"),
    "ar",
  );
  assert.equal(
    pageLocale("https://app.luma.green/admin", catalogues, "ar"),
    "en",
  );
});
test("offline page is localized, RTL-ready, escaped and has no script or bridge", () => {
  const html = offlineHtml(message, "ar", "https://app.luma.green/ar");
  assert.match(html, /dir="rtl"/u);
  assert.match(html, /&lt;Offline&gt;/u);
  assert.match(html, /href="https:\/\/app.luma.green\/ar"/u);
  assert.match(html, /default-src 'none'/u);
  assert.doesNotMatch(html, /<script|onclick|ipcRenderer/u);
});

test("English unprefixed navigation resets a previous Arabic menu", () => {
  assert.equal(pageLocale("https://app.luma.green/", catalogues, "ar"), "en");
  assert.equal(
    pageLocale("https://app.luma.green/sell", catalogues, "ar"),
    "en",
  );
});

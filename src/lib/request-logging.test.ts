import { expect, it } from "vitest";

import { privateRequestLogPatterns } from "./request-logging";

it.each([
  "/api/auth/verify-email?token=harmless-marker",
  "/en/login/email/verify?token=harmless-marker",
  "/ar/login/email/reset?token=harmless-marker",
  "/admin/reset-password?token=harmless-marker",
  "/ur/account/workspaces/invite?token=harmless-marker",
  "/login?next=%2Faccount%2Fworkspaces%2Finvite%3Ftoken%3Dharmless-marker",
  "/t/synthetic-booking-token",
  "/other?token=harmless-marker",
])("keeps sensitive request URL %s out of development access logs", (path) => {
  expect(privateRequestLogPatterns.some((pattern) => pattern.test(path))).toBe(
    true,
  );
});

it.each(["/", "/ar/materials", "/en/how-it-works", "/_next/static/app.js"])(
  "retains ordinary request diagnostics for %s",
  (path) => {
    expect(
      privateRequestLogPatterns.some((pattern) => pattern.test(path)),
    ).toBe(false);
  },
);

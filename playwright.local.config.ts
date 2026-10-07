import { readFileSync } from "node:fs";

import { defineConfig, devices } from "@playwright/test";
import { z } from "zod";

// Playwright's automatic failure ARIA snapshot can contain a TOTP enrollment
// key. Keep diagnostics explicit and redacted for these real-account tests.
process.env.PLAYWRIGHT_NO_COPY_PROMPT = "1";

const { site } = z
  .object({ site: z.url() })
  .parse(
    JSON.parse(
      readFileSync(".convex/local-acceptance/credentials.json", "utf8"),
    ),
  );
const origin = new URL(site);
if (
  origin.protocol !== "http:" ||
  !["localhost", "127.0.0.1", "[::1]"].includes(origin.hostname) ||
  origin.origin !== site
) {
  throw new Error("Workspace acceptance requires the provisioned local site.");
}

// The root task starts the local backend, inbox and app. This config never deploys.
export default defineConfig({
  testDir: "./e2e/connected",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 120_000,
  expect: { timeout: 15_000 },
  reporter: "list",
  use: {
    baseURL: site,
    // The flow handles passwords and invitation URLs. Keep them out of artifacts.
    trace: "off",
    screenshot: "off",
    video: "off",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});

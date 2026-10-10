import { ConvexError } from "convex/values";

import { investorDemoImportEnv } from "../../src/lib/env";
import { INVESTOR_DEMO_BATCH } from "./investorDemoRoster";

const HOSTED_TARGETS = new Set([
  "https://outstanding-buzzard-942.eu-west-1.convex.site",
  "https://glorious-rooster-470.eu-west-1.convex.site",
]);
const LOCAL_TARGETS = new Set([
  "http://localhost:3211",
  "http://127.0.0.1:3211",
]);
const MAX_IMPORT_WINDOW_MS = 24 * 60 * 60 * 1000;

/** No public caller can enable this gate; deployment operators must set both values. */
export function requireInvestorDemoImport(batchKey: string) {
  const config = investorDemoImportEnv();
  const target = process.env.CONVEX_SITE_URL;
  const expiresAt = Date.parse(config.expiresAt ?? "");
  const now = Date.now();
  const isLocalTarget = target !== undefined && LOCAL_TARGETS.has(target);
  const isHostedTarget = target !== undefined && HOSTED_TARGETS.has(target);
  if (
    batchKey !== INVESTOR_DEMO_BATCH ||
    (!isLocalTarget && !isHostedTarget) ||
    config.targetUrl !== target ||
    !config.expiresAt?.endsWith("Z") ||
    !Number.isFinite(expiresAt) ||
    expiresAt <= now ||
    expiresAt - now > MAX_IMPORT_WINDOW_MS ||
    (isHostedTarget &&
      (process.env.AUTH_LOCAL_TEST_MODE === "true" ||
        process.env.AUTH_DEV_MODE === "true"))
  ) {
    throw new ConvexError("INVESTOR_DEMO_IMPORT_DISABLED");
  }
}

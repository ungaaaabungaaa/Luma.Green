// @vitest-environment node
import { afterEach, expect, it, vi } from "vitest";

const fixture = vi.hoisted(() => ({
  sensitive: "SENSITIVE-COMMAND-PASSWORD-HASH-DO-NOT-PRINT",
  hashPassword: vi.fn(() => {
    throw new Error("Existing credentials must not be regenerated.");
  }),
  writes: [] as { path: string; data: string }[],
}));
vi.mock("better-auth/crypto", () => ({
  hashPassword: fixture.hashPassword,
}));
vi.mock("node:child_process", () => ({
  execFileSync: vi.fn(() => {
    throw Object.assign(new Error(`Command failed: ${fixture.sensitive}`), {
      stderr: fixture.sensitive,
      stdout: fixture.sensitive,
      cmd: fixture.sensitive,
    });
  }),
}));
vi.mock("node:fs/promises", () => ({
  mkdir: vi.fn(),
  chmod: vi.fn(),
  readFile: vi.fn(async () => {
    const { INVESTOR_DEMO_BATCH, INVESTOR_DEMO_ROSTER } =
      await import("../convex/lib/investorDemoRoster");
    return JSON.stringify({
      batchKey: INVESTOR_DEMO_BATCH,
      deployment: "outstanding-buzzard-942",
      accounts: INVESTOR_DEMO_ROSTER.map((persona) => ({
        key: persona.key,
        name: persona.name,
        email: persona.email,
        password: "Synthetic-test-password-not-a-live-secret",
        passwordHash: fixture.sensitive,
      })),
    });
  }),
  writeFile: vi.fn((path: string, data: string) => {
    fixture.writes.push({ path, data });
  }),
}));
const original = { argv: process.argv, exitCode: process.exitCode };
afterEach(() => {
  process.argv = original.argv;
  process.exitCode = original.exitCode;
  vi.restoreAllMocks();
});
it("redacts child command errors and writes only an allowlisted failure summary", async () => {
  process.argv = ["node", "provision.mts", "production", "apply"];
  const stderr = vi.spyOn(process.stderr, "write").mockReturnValue(true);
  const stdout = vi.spyOn(process.stdout, "write").mockReturnValue(true);
  await import("../scripts/investor-demo/provision.mjs");
  expect(process.exitCode).toBe(1);
  expect(fixture.hashPassword).not.toHaveBeenCalled();
  expect(stderr).toHaveBeenCalledWith(
    "Demo provisioning failed at import-identity for household-1. No diagnostic arguments were printed.\n",
  );
  expect(stdout).not.toHaveBeenCalled();
  expect(fixture.writes).toHaveLength(1);
  expect(JSON.parse(fixture.writes[0]?.data ?? "null")).toEqual({
    status: "failed",
    stage: "import-identity",
    personaKey: "household-1",
    completedIdentities: 0,
    error: "DEMO_PROVISIONING_FAILED",
  });
  expect(JSON.stringify(fixture.writes)).not.toContain(fixture.sensitive);
  expect(JSON.stringify(stderr.mock.calls)).not.toContain(fixture.sensitive);
});

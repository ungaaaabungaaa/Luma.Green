import { describe, expect, it } from "vitest";

import {
  INVESTOR_DEMO_BATCH,
  INVESTOR_DEMO_ROSTER,
} from "./investorDemoRoster";
import { LOCAL_ACCEPTANCE_PERSONAS } from "./localAcceptance";

describe("investor demo roster", () => {
  it("covers every supported persona with five distinct fictional identities and no platform admin", () => {
    expect(INVESTOR_DEMO_BATCH).toBe("investor-2026-10-10");
    expect(INVESTOR_DEMO_ROSTER).toHaveLength(140);
    expect(new Set(INVESTOR_DEMO_ROSTER.map((row) => row.email)).size).toBe(
      140,
    );
    expect(new Set(INVESTOR_DEMO_ROSTER.map((row) => row.key)).size).toBe(140);
    for (const template of LOCAL_ACCEPTANCE_PERSONAS)
      expect(
        INVESTOR_DEMO_ROSTER.filter((row) => row.templateKey === template.key),
      ).toHaveLength(5);
    for (const row of INVESTOR_DEMO_ROSTER) {
      expect(row.name.startsWith("DEMO ")).toBe(true);
      expect(row.email.endsWith("@investor.luma.invalid")).toBe(true);
      expect(row.templateKey).not.toBe("admin");
    }
  });
});

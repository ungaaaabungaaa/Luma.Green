import { describe, expect, it } from "vitest";

import {
  APPLICATION_STATUSES,
  type ApplicationStatus,
  canMove,
  isEditable,
} from "./lifecycle";

describe("application lifecycle", () => {
  const allowed: [ApplicationStatus, ApplicationStatus][] = [
    ["draft", "submitted"],
    ["submitted", "approved"],
    ["submitted", "changes_requested"],
    ["submitted", "rejected"],
    ["changes_requested", "submitted"],
    ["approved", "suspended"],
    ["suspended", "approved"],
  ];

  it("allows exactly the documented moves", () => {
    for (const from of APPLICATION_STATUSES) {
      for (const to of APPLICATION_STATUSES) {
        const isExpected = allowed.some(([a, b]) => a === from && b === to);
        expect(canMove(from, to), `${from} → ${to}`).toBe(isExpected);
      }
    }
  });

  it("lets the applicant edit only before review or when asked to fix", () => {
    expect(APPLICATION_STATUSES.filter((status) => isEditable(status))).toEqual(
      ["draft", "changes_requested"],
    );
  });
});

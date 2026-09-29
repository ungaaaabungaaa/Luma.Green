/**
 * An application's states — docs/product/onboarding.md#application-states.
 * Every move goes through `canMove`; the functions that make a move also write
 * the audit log.
 */

export const APPLICATION_STATUSES = [
  "draft",
  "submitted",
  "changes_requested",
  "approved",
  "rejected",
  "suspended",
] as const;

export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

const NEXT: Record<ApplicationStatus, readonly ApplicationStatus[]> = {
  draft: ["submitted"],
  submitted: ["approved", "changes_requested", "rejected"],
  changes_requested: ["submitted"],
  approved: ["suspended"],
  rejected: [],
  suspended: ["approved"],
};

export function canMove(
  from: ApplicationStatus,
  to: ApplicationStatus,
): boolean {
  return NEXT[from].includes(to);
}

/** The applicant can change the form and uploads only in these states. */
export function isEditable(status: ApplicationStatus): boolean {
  return status === "draft" || status === "changes_requested";
}

/** Hours in review before an application shows as due soon, then overdue. */
export const SLA_DUE_SOON_HOURS = 18;
export const SLA_OVERDUE_HOURS = 24;

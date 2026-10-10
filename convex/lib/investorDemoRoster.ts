import { LOCAL_ACCEPTANCE_PERSONAS } from "./localAcceptance";

export const INVESTOR_DEMO_BATCH = "investor-2026-10-10" as const;
export const INVESTOR_DEMO_COHORTS = 5;

/** Fictional identities, labelled in every UI. Never real customer accounts. */
export const INVESTOR_DEMO_ROSTER = Array.from(
  { length: INVESTOR_DEMO_COHORTS },
  (_, index) => index + 1,
).flatMap((cohort) =>
  LOCAL_ACCEPTANCE_PERSONAS.map((template) => ({
    key: `${template.key}-${String(cohort)}`,
    templateKey: template.key,
    cohort,
    name: `DEMO ${template.name.replace("Local test ", "")} ${String(cohort)}`,
    email: `${template.key}-${String(cohort)}@investor.luma.invalid`,
    access: template.access,
  })),
);

export function getInvestorDemoPersona(key: string) {
  return INVESTOR_DEMO_ROSTER.find((persona) => persona.key === key);
}

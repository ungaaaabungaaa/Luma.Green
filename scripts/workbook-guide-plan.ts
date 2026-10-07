/** Read-only real-browser evidence plan. These descriptions do not assert a pass. */
export const workbookGuideCases = [
  {
    name: "logistics-history",
    persona: "kabadiwala",
    route: "/app/logistics",
    namespace: "logistics",
    label: "history",
    action: "history",
    description:
      "Saved synthetic route revision history. Manual coordinates and straight-line distance; no pickup or dispatch.",
  },
  {
    name: "logistics-form",
    persona: "kabadiwala",
    route: "/app/logistics",
    namespace: "logistics",
    label: "add",
    action: "dialog",
    description:
      "Blank route plan form opened by an authenticated owner. No plan submitted.",
  },
  {
    name: "standards-definitions",
    persona: "kabadiwala",
    route: "/app/material-standards",
    namespace: "operations",
    label: "definitions",
    action: "tab",
    description:
      "Current reviewed-definition search, including an honest empty result if the test definition was retired.",
  },
  {
    name: "standards-reviews",
    persona: "kabadiwala",
    route: "/app/material-standards",
    namespace: "operations",
    label: "reviews",
    action: "tab",
    description:
      "Current workspace facility evidence review history. No regulatory approval or portal execution claimed.",
  },
  {
    name: "standards-destinations",
    persona: "kabadiwala",
    route: "/app/material-standards",
    namespace: "operations",
    label: "destinations",
    action: "tab",
    description:
      "Currently available reviewed destinations. Withdrawn test destinations are not restored for a screenshot.",
  },
  {
    name: "production-recipes",
    persona: "kabadiwala",
    route: "/app/production",
    namespace: "operations",
    label: "recipes",
    action: "tab",
    description:
      "Real saved synthetic recipe revisions with recorded proportions and additive declarations.",
  },
  {
    name: "production-form",
    persona: "kabadiwala",
    route: "/app/production",
    namespace: "operations",
    label: "newRecipe",
    action: "dialog",
    description:
      "Blank recipe version form. No production, inventory or certification is created.",
  },
  {
    name: "production-batches",
    persona: "kabadiwala",
    route: "/app/production",
    namespace: "operations",
    label: "batches",
    action: "tab",
    description:
      "Recorded synthetic production declarations linked to measured inputs, recipe and output inspection. Input share is not certified recycled product content.",
  },
  {
    name: "sourcing-board",
    persona: "preprocessor",
    route: "/app/sourcing",
    namespace: "sourcing",
    label: "board",
    action: "tab",
    description:
      "Actual demand board with synthetic local records; no purchase order or reservation implied.",
  },
  {
    name: "sourcing-recurring",
    persona: "preprocessor",
    route: "/app/sourcing",
    namespace: "sourcing",
    label: "plans",
    action: "tab",
    description:
      "Recurring demand schedules requiring explicit publication of each occurrence.",
  },
  {
    name: "sourcing-decisions",
    persona: "preprocessor",
    route: "/app/sourcing",
    namespace: "sourcing",
    label: "qualifications",
    action: "tab",
    description:
      "Private buyer supplier decision history with synthetic specifications. No platform approval implied.",
  },
  {
    name: "sourcing-agreements",
    persona: "preprocessor",
    route: "/app/sourcing",
    namespace: "sourcing",
    label: "agreements",
    action: "tab",
    description:
      "Standing supply agreements and release-history controls. Separate supplier intent is not delivery or payment.",
  },
  {
    name: "quality-incoming",
    persona: "preprocessor",
    route: "/app/quality-documents",
    namespace: "qualityDocuments",
    label: "incoming",
    action: "section",
    description:
      "Quality documents explicitly shared with this buyer and its separate decision controls. No files downloaded.",
  },
  {
    name: "quality-upload",
    persona: "manufacturer",
    route: "/app/quality-documents",
    namespace: "qualityDocuments",
    label: "upload",
    action: "section",
    description:
      "Authenticated owner upload controls. No file selected, uploaded, downloaded or externally verified.",
  },
  {
    name: "quality-history",
    persona: "manufacturer",
    route: "/app/quality-documents",
    namespace: "qualityDocuments",
    label: "own",
    action: "section",
    description:
      "Existing synthetic private document history, with current withdrawal state preserved.",
  },
  {
    name: "report-share",
    persona: "manufacturer",
    route: "/account/reports",
    namespace: "auditReports",
    label: "create",
    action: "section",
    description:
      "Blank purpose-scoped audit sharing form. No new grant, recipient message or download is created.",
  },
  {
    name: "report-received",
    persona: "auditor",
    route: "/account/reports",
    namespace: "auditReports",
    label: "received",
    action: "section",
    description:
      "Only reports granted to this approved synthetic auditor. The connected test's revoked grant remains unavailable.",
  },
  {
    name: "logistics-viewer",
    persona: "team-viewer",
    route: "/app/logistics",
    namespace: "logistics",
    label: "title",
    action: "section",
    description:
      "Actual selected-workspace viewer route list. Create controls are absent; no role bypass.",
  },
  {
    name: "admin-definitions",
    persona: "admin",
    route: "/admin/operations",
    namespace: "admin",
    label: "Material definitions",
    action: "tab",
    description:
      "Actual local admin material-definition draft and review controls. No review saved.",
  },
  {
    name: "admin-facilities",
    persona: "admin",
    route: "/admin/operations",
    namespace: "admin",
    label: "Facility scope",
    action: "tab",
    description:
      "Actual local admin facility evidence review controls. No regulatory permission inferred.",
  },
  {
    name: "admin-destinations",
    persona: "admin",
    route: "/admin/operations",
    namespace: "admin",
    label: "Destinations",
    action: "tab",
    description:
      "Actual local admin controlled-destination registry and synthetic retained history. No status changed.",
  },
] as const;

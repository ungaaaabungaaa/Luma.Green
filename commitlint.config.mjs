/**
 * Conventional Commits. The type prefix is what drives the changelog and makes
 * `git log --oneline` readable a year from now.
 *
 *   feat(inventory): add partial-lot reservations
 *   fix(i18n): fall back to English for missing Gujarati keys
 */
const config = {
  extends: ["@commitlint/config-conventional"],
  rules: {
    "scope-enum": [
      1,
      "always",
      [
        "app",
        "ui",
        "i18n",
        "convex",
        "auth",
        "inventory",
        "trade",
        "carbon",
        "seo",
        "ci",
        "deps",
        "docs",
        "test",
        "mobile",
        "infra",
      ],
    ],
    "body-max-line-length": [0, "always"],
  },
};

export default config;

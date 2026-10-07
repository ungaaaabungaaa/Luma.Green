import { expect, it } from "vitest";

import { locales } from "../../src/i18n/locales";
import { workspaceEmailCopy } from "./workspaceEmailCopy";
it.each(locales)(
  "keeps %s invitation email copy equal to the catalogue source",
  async (locale) => {
    const messages = (await import(`../../messages/${locale}.json`)) as {
      workspace: { inviteTitle: string; emailBody: string };
    };
    expect(workspaceEmailCopy[locale]).toEqual({
      inviteTitle: messages.workspace.inviteTitle,
      emailBody: messages.workspace.emailBody,
    });
  },
);

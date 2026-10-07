import { v } from "convex/values";
import { createTranslator } from "next-intl";

import { isLocale } from "../src/i18n/locales";
import { authEmailEnv } from "../src/lib/env";
import { internal } from "./_generated/api";
import { internalAction } from "./_generated/server";
import { sendAuthEmail } from "./lib/authEmail";
import { workspaceEmailCopy } from "./lib/workspaceEmailCopy";

/** One claimed send, with no automatic retry after an uncertain provider result. */
export const sendInvitation = internalAction({
  args: {
    invitationId: v.id("workspaceInvitations"),
    token: v.string(),
    locale: v.string(),
  },
  returns: v.null(),
  // eslint-disable-next-line sonarjs/no-invariant-returns -- Convex null action uses an early no-op return when the invitation cannot be sent.
  handler: async (ctx, args) => {
    const invitation = await ctx.runMutation(
      internal.workspace.claimInvitationEmail,
      { invitationId: args.invitationId, token: args.token },
    );
    if (!invitation) return null;
    let isAccepted = false;
    try {
      const config = authEmailEnv();
      if (!config) throw new Error("EMAIL_DELIVERY_UNAVAILABLE");
      const locale = isLocale(args.locale) ? args.locale : "en";
      const copy = createTranslator({
        locale,
        messages: workspaceEmailCopy[locale],
      });
      const prefix = locale === "en" ? "" : `/${locale}`;
      const url = new URL(
        `${prefix}/account/workspaces/invite`,
        config.siteUrl,
      );
      url.searchParams.set("token", args.token);
      await sendAuthEmail({
        to: invitation.email,
        kind: "workspace-invitation",
        subject: copy("inviteTitle"),
        text: `${copy("emailBody", { name: invitation.orgName })}\n\n${url.href}`,
      });
      isAccepted = true;
    } catch {
      // An explicit delivery state is persisted; provider bodies can contain secrets.
    }
    await ctx.runMutation(internal.workspace.recordInvitationDelivery, {
      invitationId: args.invitationId,
      accepted: isAccepted,
    });
    return null;
  },
});

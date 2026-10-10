import { ConvexError, v } from "convex/values";

import { internalMutation } from "./_generated/server";
import { createAuth } from "./auth";
import { isAdminEmail } from "./lib/admin";
import { requireInvestorDemoImport } from "./lib/investorDemoGuard";
import { getInvestorDemoPersona } from "./lib/investorDemoRoster";

async function passwordDigest(value: string) {
  const bytes = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return [...new Uint8Array(bytes)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Operator-only, bounded import of the exact fictional roster. The trusted runner
 * uses Better Auth's official hashPassword. No plaintext, session, phone proof or
 * external delivery enters this mutation. It does not change normal signup rules.
 */
export const seedIdentity = internalMutation({
  args: {
    batchKey: v.literal("investor-2026-10-10"),
    personaKey: v.string(),
    passwordHash: v.string(),
  },
  returns: v.object({
    authUserId: v.string(),
    profileId: v.id("profiles"),
    created: v.boolean(),
  }),
  handler: async (ctx, args) => {
    requireInvestorDemoImport(args.batchKey);
    const persona = getInvestorDemoPersona(args.personaKey);
    if (
      !persona ||
      !persona.email.endsWith("@investor.luma.invalid") ||
      isAdminEmail(persona.email) ||
      !/^[a-f\d]{32}:[a-f\d]{128}$/.test(args.passwordHash)
    ) {
      throw new ConvexError("INVESTOR_DEMO_IDENTITY_INVALID");
    }
    const digest = await passwordDigest(args.passwordHash);
    const auth = await createAuth(ctx).$context;
    const adapter = auth.internalAdapter;
    const receipt = await ctx.db
      .query("investorDemoAccounts")
      .withIndex("by_batch_persona", (q) =>
        q.eq("batchKey", args.batchKey).eq("personaKey", args.personaKey),
      )
      .unique();
    const existing = await adapter.findUserByEmail(persona.email, {
      includeAccounts: true,
    });
    if (receipt) {
      const profile = await ctx.db.get(receipt.profileId);
      const credentials = existing?.accounts.filter(
        (account) => account.providerId === "credential",
      );
      if (
        receipt.email !== persona.email ||
        receipt.passwordHashDigest !== digest ||
        existing?.user.id !== receipt.authUserId ||
        !existing.user.emailVerified ||
        profile?.authUserId !== receipt.authUserId ||
        profile.kind !== "member" ||
        credentials?.length !== 1 ||
        credentials[0]?.password !== args.passwordHash
      ) {
        throw new ConvexError("INVESTOR_DEMO_IDENTITY_DRIFT");
      }
      return {
        authUserId: receipt.authUserId,
        profileId: receipt.profileId,
        created: false,
      };
    }
    const otherReceipt = await ctx.db
      .query("investorDemoAccounts")
      .withIndex("by_email", (q) => q.eq("email", persona.email))
      .unique();
    if (existing || otherReceipt) {
      throw new ConvexError("INVESTOR_DEMO_IDENTITY_COLLISION");
    }
    const user = await adapter.createUser({
      name: persona.name,
      email: persona.email,
      emailVerified: true,
    });
    await adapter.createAccount({
      userId: user.id,
      accountId: user.id,
      providerId: "credential",
      password: args.passwordHash,
    });
    const now = Date.now();
    const profileId = await ctx.db.insert("profiles", {
      authUserId: user.id,
      kind: "member",
      locale: "en",
      createdAt: now,
      updatedAt: now,
    });
    await ctx.db.insert("investorDemoAccounts", {
      batchKey: args.batchKey,
      personaKey: persona.key,
      email: persona.email,
      authUserId: user.id,
      profileId,
      passwordHashDigest: digest,
      createdAt: now,
    });
    await ctx.db.insert("auditLog", {
      action: "investor.demo.identity.imported",
      entityTable: "profiles",
      entityId: profileId,
      metadata: {
        batchKey: args.batchKey,
        personaKey: persona.key,
        verificationSource: "operator_imported_fictional_identity",
        phoneVerificationClaimed: false,
      },
      createdAt: now,
    });
    return { authUserId: user.id, profileId, created: true };
  },
});

/// <reference types="vite/client" />
/**
 * Test-only helpers (the Convex bundler skips files with two dots in the
 * name). Signs a fake person in the way Better Auth would: a user and a live
 * session in the local `betterAuth` component, and an identity that points at
 * that session.
 */
import type { TestConvex } from "convex-test";

import { components, internal } from "../_generated/api";
import authSchema from "../betterAuth/schema";
import type schema from "../schema";

type Test = TestConvex<typeof schema>;

/** Function modules as the Convex bundler sees them: no tests, no helpers. */
export function convexModules(
  glob: Record<string, () => Promise<unknown>>,
): Record<string, () => Promise<unknown>> {
  return Object.fromEntries(
    Object.entries(glob).filter(([path]) => {
      const base = path.split("/").pop() ?? "";
      return (base.match(/\./g) ?? []).length === 1;
    }),
  );
}

export function registerAuth(t: Test): void {
  t.registerComponent(
    "betterAuth",
    authSchema,
    convexModules(import.meta.glob("../betterAuth/**/*.*s")),
  );
}

export async function signIn(
  t: Test,
  person: { email: string; phoneNumber?: string; twoFactorEnabled?: boolean },
) {
  const now = Date.now();
  const { userId, sessionId } = await t.run(async (ctx) => {
    const user = (await ctx.runMutation(components.betterAuth.adapter.create, {
      input: {
        model: "user",
        data: {
          name: person.phoneNumber ?? person.email,
          email: person.email,
          emailVerified: false,
          phoneNumber: person.phoneNumber,
          phoneNumberVerified: person.phoneNumber ? true : undefined,
          twoFactorEnabled: person.twoFactorEnabled ?? false,
          createdAt: now,
          updatedAt: now,
        },
      },
    })) as { _id: string };
    const session = (await ctx.runMutation(
      components.betterAuth.adapter.create,
      {
        input: {
          model: "session",
          data: {
            userId: user._id,
            token: `token-${user._id}`,
            expiresAt: now + 60 * 60 * 1000,
            createdAt: now,
            updatedAt: now,
          },
        },
      },
    )) as { _id: string };
    return { userId: user._id, sessionId: session._id };
  });
  return t.withIdentity({ subject: userId, sessionId });
}

/**
 * Seeds the whole demo world (convex/lib/demo.ts) into a test deployment.
 * Stub AUTH_DEV_MODE=true first (`vi.stubEnv`).
 */
export async function seedDemo(t: Test): Promise<void> {
  const files = await t.run(async (ctx) => ({
    certificate: await ctx.storage.store(new Blob(["%PDF-1.4 demo"])),
    photoA: await ctx.storage.store(new Blob(["<svg/>"])),
    photoB: await ctx.storage.store(new Blob(["<svg/>"])),
  }));
  await t.mutation(internal.demo.seedData, { files });
}

/** Signs in as an existing user (e.g. a seeded demo phone). */
export async function signInAs(t: Test, phoneNumber: string) {
  const now = Date.now();
  const sessionId = await t.run(async (ctx) => {
    const user = (await ctx.runQuery(components.betterAuth.adapter.findOne, {
      model: "user",
      where: [{ field: "phoneNumber", value: phoneNumber }],
    })) as { _id: string } | null;
    if (!user) throw new Error(`No user with ${phoneNumber}`);
    const session = (await ctx.runMutation(
      components.betterAuth.adapter.create,
      {
        input: {
          model: "session",
          data: {
            userId: user._id,
            token: `token-${user._id}-${String(now)}`,
            expiresAt: now + 60 * 60 * 1000,
            createdAt: now,
            updatedAt: now,
          },
        },
      },
    )) as { _id: string; userId: string };
    return { sessionId: session._id, userId: session.userId };
  });
  return t.withIdentity({
    subject: sessionId.userId,
    sessionId: sessionId.sessionId,
  });
}

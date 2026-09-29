/// <reference types="vite/client" />
/**
 * Test-only helpers (the Convex bundler skips files with two dots in the
 * name). Signs a fake person in the way Better Auth would: a user and a live
 * session in the local `betterAuth` component, and an identity that points at
 * that session.
 */
import type { TestConvex } from "convex-test";

import { components } from "../_generated/api";
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

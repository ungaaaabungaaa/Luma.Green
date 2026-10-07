import { execFileSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { chmod, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { ConvexHttpClient } from "convex/browser";
import { z } from "zod";

import { api } from "../../convex/_generated/api";
import {
  isLoopbackHttpOrigin,
  LOCAL_ACCEPTANCE_PERSONAS,
} from "../../convex/lib/localAcceptance";

// Explicit local files. Never select a hosted deployment or accept a --prod flag.
process.loadEnvFile(".env.local");
process.loadEnvFile(".convex/local-acceptance/backend.env");
const config = z
  .object({
    SITE_URL: z.string().refine(isLoopbackHttpOrigin),
    NEXT_PUBLIC_CONVEX_URL: z.string().refine(isLoopbackHttpOrigin),
    NEXT_PUBLIC_CONVEX_SITE_URL: z.string().refine(isLoopbackHttpOrigin),
    AUTH_LOCAL_TEST_MODE: z.literal("true"),
    AUTH_LOCAL_EMAIL_INBOX_URL: z.url(),
    AUTH_LOCAL_EMAIL_INBOX_TOKEN: z.string().min(32),
  })
  .parse(process.env);
const inbox = new URL(config.AUTH_LOCAL_EMAIL_INBOX_URL);
if (!isLoopbackHttpOrigin(inbox.origin) || inbox.pathname !== "/deliver") {
  throw new Error("The acceptance inbox must be a loopback /deliver endpoint.");
}
if (process.argv.length !== 2)
  throw new Error("This runner accepts no deployment arguments.");

const privateDir = path.resolve(".convex/local-acceptance");
const credentialsPath = path.resolve(privateDir, "credentials.json");
const accountSchema = z.object({
  key: z.string(),
  name: z.string(),
  email: z.email(),
  password: z.string().min(12),
});
const credentialSchema = z.object({
  version: z.literal(1),
  site: z.string(),
  accounts: z.array(accountSchema),
});
await mkdir(privateDir, { recursive: true, mode: 0o700 });
await chmod(privateDir, 0o700);
let credentials: z.infer<typeof credentialSchema>;
try {
  credentials = credentialSchema.parse(
    JSON.parse(await readFile(credentialsPath, "utf8")),
  );
  if (credentials.site !== config.SITE_URL)
    throw new Error("Credential file belongs to a different local site.");
} catch (error) {
  if (!(error instanceof Error && "code" in error && error.code === "ENOENT"))
    throw error;
  credentials = {
    version: 1,
    site: config.SITE_URL,
    accounts: LOCAL_ACCEPTANCE_PERSONAS.map(({ key, name, email }) => ({
      key,
      name,
      email,
      password: randomBytes(24).toString("base64url"),
    })),
  };
  // Save before creation. An interrupted run can reuse the same credentials.
  await writeFile(
    credentialsPath,
    `${JSON.stringify(credentials, null, 2)}\n`,
    { flag: "wx", mode: 0o600 },
  );
}
await chmod(credentialsPath, 0o600);

const inboxHeaders = {
  Authorization: `Bearer ${config.AUTH_LOCAL_EMAIL_INBOX_TOKEN}`,
};
const messageSchema = z.object({ kind: z.string(), text: z.string() });
const messagesSchema = z.object({ messages: z.array(messageSchema) });
const userSchema = z.object({ user: z.object({ id: z.string() }) });
const jwtSchema = z.object({ token: z.string() });
const accounts: { key: string; authUserId: string }[] = [];

for (const [personaIndex, persona] of LOCAL_ACCEPTANCE_PERSONAS.entries()) {
  const credential = credentials.accounts.find(
    ({ key, email }) => key === persona.key && email === persona.email,
  );
  if (!credential)
    throw new Error(
      `Missing saved credential for ${persona.key}. Do not silently rotate it.`,
    );
  const cookies = new Map<string, string>();
  async function authRequest(path: string, body?: unknown) {
    const response = await fetch(`${config.SITE_URL}/api/auth/${path}`, {
      method: body === undefined ? "GET" : "POST",
      redirect: "manual",
      headers: {
        "Content-Type": "application/json",
        Origin: config.SITE_URL,
        // Isolated simulated clients; do not disable the real per-client limits.
        "X-Forwarded-For": `192.0.2.${String(personaIndex + 1)}`,
        Cookie: [...cookies]
          .map(([name, value]) => `${name}=${value}`)
          .join("; "),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    for (const cookie of response.headers.getSetCookie()) {
      const pair = cookie.split(";", 1)[0] ?? "";
      const separator = pair.indexOf("=");
      if (separator > 0)
        cookies.set(pair.slice(0, separator), pair.slice(separator + 1));
    }
    return response;
  }
  const signInBody = { email: credential.email, password: credential.password };
  let signIn = await authRequest("sign-in/email", signInBody);
  if (!signIn.ok) {
    const signUp = await authRequest("sign-up/email", {
      ...signInBody,
      name: credential.name,
    });
    if (!signUp.ok && signUp.status !== 422) {
      throw new Error(
        `Local signup failed for ${persona.key} (HTTP ${String(signUp.status)}).`,
      );
    }
    const messagesUrl = new URL("/messages", inbox.origin);
    messagesUrl.searchParams.set("to", credential.email);
    const response = await fetch(messagesUrl, { headers: inboxHeaders });
    if (!response.ok)
      throw new Error(
        `Local inbox request failed (HTTP ${String(response.status)}).`,
      );
    const messages = messagesSchema.parse(await response.json()).messages;
    const message = messages.findLast(({ kind }) => kind === "verification");
    const rawLink = message?.text.match(/https?:\/\/[^\s<>]+/)?.[0];
    if (!rawLink)
      throw new Error(`No verification message for ${persona.key}.`);
    const link = new URL(rawLink);
    if (
      link.origin !== config.SITE_URL ||
      !/^\/(?:[a-z]{2}\/)?login\/email\/verify$/.test(link.pathname)
    ) {
      throw new Error(
        "Verification link does not belong to this local auth server.",
      );
    }
    const token = link.searchParams.get("token");
    if (!token)
      throw new Error(`Verification token missing for ${persona.key}.`);
    const verify = await authRequest(
      `verify-email?${new URLSearchParams({ token }).toString()}`,
    );
    if (!verify.ok && verify.status !== 302)
      throw new Error(`Email verification failed for ${persona.key}.`);
    signIn = await authRequest("sign-in/email", signInBody);
  }
  if (!signIn.ok)
    throw new Error(
      `Local sign-in failed for ${persona.key} (HTTP ${String(signIn.status)}).`,
    );
  const user = userSchema.parse(await signIn.json()).user;
  const tokenResponse = await authRequest("convex/token");
  if (!tokenResponse.ok)
    throw new Error(`Local Convex session failed for ${persona.key}.`);
  const client = new ConvexHttpClient(config.NEXT_PUBLIC_CONVEX_URL);
  client.setAuth(jwtSchema.parse(await tokenResponse.json()).token);
  await client.mutation(api.identity.ensureProfile, { locale: "en" });
  accounts.push({ key: persona.key, authUserId: user.id });
  await authRequest("sign-out", {});
  process.stdout.write(`Verified local account: ${persona.key}\n`);
}

// Only the local CLI can call the internal fixture mutation. No credentials in argv.
execFileSync(
  // eslint-disable-next-line sonarjs/no-os-command-from-path -- Use the installed project CLI after loopback validation; no shell or user-supplied command.
  "pnpm",
  [
    "--config.verify-deps-before-run=false",
    "exec",
    "convex",
    "run",
    "localAcceptance:seed",
    JSON.stringify({ accounts }),
  ],
  { stdio: "inherit" },
);
process.stdout.write(
  `Provisioned ${String(accounts.length)} local accounts. Passwords are in the restricted local annex source.\n`,
);

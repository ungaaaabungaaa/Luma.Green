import { execFileSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { chmod, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { hashPassword } from "better-auth/crypto";
import { z } from "zod";

import {
  INVESTOR_DEMO_BATCH,
  INVESTOR_DEMO_ROSTER,
} from "../../convex/lib/investorDemoRoster";

const progress: {
  directory?: string;
  stage: string;
  personaKey?: string;
  completed: number;
} = {
  stage: "validate-arguments",
  completed: 0,
};

const credentialAccountSchema = z.object({
  key: z.string(),
  name: z.string(),
  email: z.email(),
  password: z.string().min(24),
  passwordHash: z.string(),
});
const schema = z.object({
  batchKey: z.literal(INVESTOR_DEMO_BATCH),
  deployment: z.string(),
  accounts: z.array(credentialAccountSchema),
});
function validateRoster(saved: z.infer<typeof schema>, deployment: string) {
  if (
    saved.deployment !== deployment ||
    saved.accounts.length !== INVESTOR_DEMO_ROSTER.length
  )
    throw new Error("Credential roster mismatch.");
  for (const persona of INVESTOR_DEMO_ROSTER) {
    const account = saved.accounts.find(({ key }) => key === persona.key);
    if (account?.email !== persona.email || account.name !== persona.name)
      throw new Error("Credential identity mismatch.");
  }
}

async function main() {
  const targetSchema = z.enum(["production", "development"]);
  const target = targetSchema.parse(process.argv[2]);
  const mode = z.enum(["prepare", "apply"]).parse(process.argv[3] ?? "prepare");
  if (process.argv.length > 4)
    throw new Error("Use target and prepare/apply only.");
  const deployment =
    target === "production"
      ? "outstanding-buzzard-942"
      : "glorious-rooster-470";
  const directory = path.resolve(".convex/investor-demo", target);
  progress.directory = directory;
  progress.stage = "prepare-credentials";
  await mkdir(directory, { recursive: true, mode: 0o700 });
  await chmod(directory, 0o700);
  const file = path.join(directory, "credentials.json");
  let saved: z.infer<typeof schema>;
  try {
    saved = schema.parse(JSON.parse(await readFile(file, "utf8")));
  } catch (error) {
    if (!(error instanceof Error && "code" in error && error.code === "ENOENT"))
      throw error;
    const accounts = [];
    for (const persona of INVESTOR_DEMO_ROSTER) {
      const password = randomBytes(24).toString("base64url");
      accounts.push({
        key: persona.key,
        name: persona.name,
        email: persona.email,
        password,
        passwordHash: await hashPassword(password),
      });
    }
    saved = { batchKey: INVESTOR_DEMO_BATCH, deployment, accounts };
    await writeFile(file, `${JSON.stringify(saved, null, 2)}\n`, {
      flag: "wx",
      mode: 0o600,
    });
  }
  validateRoster(saved, deployment);
  await chmod(file, 0o600);
  if (mode === "prepare") {
    process.stdout.write(
      `Prepared ${String(saved.accounts.length)} private credentials for ${deployment}. No server write.\n`,
    );
  } else {
    const cli = path.resolve("node_modules/convex/bin/main.js");
    progress.stage = "import-identity";
    const results: { key: string; result: unknown }[] = [];
    for (const account of saved.accounts) {
      progress.personaKey = account.key;
      // Only a salted Better Auth hash reaches the operator-only function. No shell interpolation.
      const output = execFileSync(
        process.execPath,
        [
          cli,
          "run",
          "investorDemoAuth:seedIdentity",
          JSON.stringify({
            batchKey: INVESTOR_DEMO_BATCH,
            personaKey: account.key,
            passwordHash: account.passwordHash,
          }),
          "--deployment",
          deployment,
        ],
        {
          encoding: "utf8",
          stdio: ["ignore", "pipe", "pipe"],
          maxBuffer: 1024 * 1024,
        },
      );
      results.push({
        key: account.key,
        result: z
          .object({
            authUserId: z.string(),
            profileId: z.string(),
            created: z.boolean(),
          })
          .parse(JSON.parse(output)),
      });
      progress.completed = results.length;
      await writeFile(
        path.join(directory, "account-receipts.json"),
        `${JSON.stringify(results, null, 2)}\n`,
        { mode: 0o600 },
      );
      process.stdout.write(
        `Imported ${String(results.length)}/${String(saved.accounts.length)} demo identities.\n`,
      );
    }
  }
}

try {
  await main();
} catch {
  // execFileSync errors contain the full command, arguments and stderr. Never
  // print/rethrow that object: password hashes are command arguments here.
  const summary = {
    status: "failed",
    stage: progress.stage,
    personaKey: progress.personaKey ?? null,
    completedIdentities: progress.completed,
    error: "DEMO_PROVISIONING_FAILED",
  };
  if (progress.directory) {
    try {
      const failureFile = path.join(progress.directory, "failure-summary.json");
      await writeFile(failureFile, `${JSON.stringify(summary, null, 2)}\n`, {
        mode: 0o600,
      });
      await chmod(failureFile, 0o600);
    } catch {
      // Even filesystem errors can include sensitive paths or cached content.
      // The nonzero exit status and generic stderr remain the failure signal.
    }
  }
  const personaLabel = progress.personaKey ? " for " + progress.personaKey : "";
  process.stderr.write(
    `Demo provisioning failed at ${progress.stage}${personaLabel}. No diagnostic arguments were printed.\n`,
  );
  process.exitCode = 1;
}

/// <reference types="vite/client" />
// @vitest-environment edge-runtime
import { convexTest } from "convex-test";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  contentDisposition,
  corsHeaders,
  fileAccess,
  fileIdFromPath,
  preflightResponse,
  trustedOrigins,
} from "./files";
import {
  convexModules,
  registerAuth,
  seedDemo,
  signIn,
  signInAs,
} from "./lib/auth.testing";
import schema from "./schema";

const modules = convexModules(import.meta.glob("./**/*.*s"));

const ADMIN_EMAIL = "admin@luma.test";
const SITE = "http://localhost:3000";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("who may open a file", () => {
  const owner = { id: "user-owner", email: "919000000107@phone.luma.green" };

  it("lets the uploader open their own file", () => {
    expect(fileAccess(owner, "user-owner", ADMIN_EMAIL)).toBe("allowed");
  });

  it("keeps it from everyone else", () => {
    expect(
      fileAccess(
        { id: "user-other", email: "919000000108@phone.luma.green" },
        "user-owner",
        ADMIN_EMAIL,
      ),
    ).toBe("forbidden");
    // A file whose uploader is gone belongs to nobody but the admin.
    expect(fileAccess(owner, null, ADMIN_EMAIL)).toBe("forbidden");
  });

  it("lets the admin in only with an authenticator", () => {
    const admin = { id: "user-admin", email: "Admin@Luma.test " };
    expect(
      fileAccess(
        { ...admin, twoFactorEnabled: true },
        "user-owner",
        ADMIN_EMAIL,
      ),
    ).toBe("allowed");
    expect(
      fileAccess(
        { ...admin, twoFactorEnabled: false },
        "user-owner",
        ADMIN_EMAIL,
      ),
    ).toBe("forbidden");
    // No ADMIN_EMAIL on the deployment: nobody is the admin.
    expect(
      fileAccess({ ...admin, twoFactorEnabled: true }, "user-owner", ""),
    ).toBe("forbidden");
  });

  it("asks a signed-out caller to sign in", () => {
    expect(fileAccess(null, "user-owner", ADMIN_EMAIL)).toBe("signed_out");
  });
});

describe("cross-origin requests", () => {
  const trusted = trustedOrigins({
    SITE_URL: "https://luma.green/",
    EXTRA_TRUSTED_ORIGINS: " http://localhost:3001 ,,not a url",
  });

  it("trust the site's origins as Better Auth does", () => {
    expect(trusted).toEqual(["https://luma.green", "http://localhost:3001"]);
  });

  it("echo a trusted origin and nothing else", () => {
    expect(corsHeaders("https://luma.green", trusted)).toEqual({
      "Access-Control-Allow-Origin": "https://luma.green",
      Vary: "Origin",
    });
    expect(corsHeaders("https://evil.example", trusted)).toEqual({
      Vary: "Origin",
    });
    expect(corsHeaders(null, trusted)).toEqual({ Vary: "Origin" });
  });

  it("allow the token header in a preflight from the site only", () => {
    const ok = preflightResponse("http://localhost:3001", trusted);
    expect(ok.status).toBe(204);
    expect(ok.headers.get("Access-Control-Allow-Headers")).toBe(
      "Authorization",
    );
    expect(preflightResponse("https://evil.example", trusted).status).toBe(403);
  });
});

describe("file responses", () => {
  it("name the file safely", () => {
    const name = 'ಪ್ರಮಾಣ "pcb".pdf';
    const header = contentDisposition(name);
    // Plain ASCII with no quotes to break out of, plus the real name encoded.
    expect(header).toMatch(/^inline; filename="[ -~]+_pcb_\.pdf"; /u);
    expect(header).not.toMatch(/filename="[^"]*"[^;]*"/);
    expect(
      header.endsWith(`filename*=UTF-8''${encodeURIComponent(name)}`),
    ).toBe(true);
  });

  it("only answer /files/{id}", () => {
    expect(fileIdFromPath("/files/kg2abc123")).toBe("kg2abc123");
    expect(fileIdFromPath("/files/")).toBeNull();
    expect(fileIdFromPath("/files/a/b")).toBeNull();
    expect(fileIdFromPath("/other/kg2abc123")).toBeNull();
  });
});

describe("GET /files/{fileId}", () => {
  async function world() {
    vi.stubEnv("ADMIN_EMAIL", ADMIN_EMAIL);
    vi.stubEnv("AUTH_DEV_MODE", "true");
    vi.stubEnv("SITE_URL", SITE);
    const t = convexTest(schema, modules);
    registerAuth(t);
    await seedDemo(t);
    // The yard applicant's consent certificate.
    const file = await t.run(async (ctx) => {
      const certificate = await ctx.db
        .query("applicationFiles")
        .filter((q) => q.eq(q.field("type"), "pcb_certificate"))
        .first();
      if (!certificate) throw new Error("No demo certificate");
      return certificate;
    });
    return { t, file, path: `/files/${file._id}` };
  }

  const fromSite = { headers: { Origin: SITE } };

  it("sends the admin the file, never cached, readable by the site", async () => {
    const { t, path } = await world();
    const admin = await signIn(t, {
      email: ADMIN_EMAIL,
      twoFactorEnabled: true,
    });
    const response = await admin.fetch(path, fromSite);
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("application/pdf");
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe(SITE);
    expect(response.headers.get("Content-Disposition")).toContain(
      "KSPCB-consent.pdf",
    );
    expect(await response.text()).toBe("%PDF-1.4 demo");
  });

  it("sends the uploader their own file", async () => {
    const { t, path } = await world();
    const owner = await signInAs(t, "+919000000107");
    const response = await owner.fetch(path, fromSite);
    expect(response.status).toBe(200);
  });

  it("refuses everyone else", async () => {
    const { t, path } = await world();
    const response = await t.fetch(path, fromSite);
    expect(response.status).toBe(401);
    // The site can still read the refusal, to ask for a sign-in.
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe(SITE);

    const other = await signInAs(t, "+919000000108");
    const forOther = await other.fetch(path, fromSite);
    expect(forOther.status).toBe(403);
    const halfwayAdmin = await signIn(t, { email: ADMIN_EMAIL });
    const forHalfwayAdmin = await halfwayAdmin.fetch(path, fromSite);
    expect(forHalfwayAdmin.status).toBe(403);
  });

  it("says not found for a file that isn't there", async () => {
    const { t, file, path } = await world();
    const admin = await signIn(t, {
      email: ADMIN_EMAIL,
      twoFactorEnabled: true,
    });
    const unknown = await admin.fetch("/files/nosuchfile", fromSite);
    expect(unknown.status).toBe(404);
    await t.run(async (ctx) => {
      await ctx.db.delete("applicationFiles", file._id);
    });
    const deleted = await admin.fetch(path, fromSite);
    expect(deleted.status).toBe(404);
  });

  it("answers the browser's preflight", async () => {
    const { t, path } = await world();
    const ok = await t.fetch(path, { method: "OPTIONS", ...fromSite });
    expect(ok.status).toBe(204);
    expect(ok.headers.get("Access-Control-Allow-Origin")).toBe(SITE);
    expect(ok.headers.get("Access-Control-Allow-Methods")).toContain("GET");
    const elsewhere = await t.fetch(path, {
      method: "OPTIONS",
      headers: { Origin: "https://evil.example" },
    });
    expect(elsewhere.status).toBe(403);
  });
});

import { authClient } from "@/lib/auth-client";
import { convexSiteUrlFrom } from "@/lib/convex-urls";
import { clientEnv } from "@/lib/env";

/**
 * Opens a private file (docs/architecture/auth.md#private-files): the
 * browser asks the deployment's `/files/{id}` route with its Convex token,
 * and the route checks who's asking on every request.
 */

export type PrivateFileProblem =
  "unavailable" | "signedOut" | "forbidden" | "notFound" | "failed";

export class PrivateFileError extends Error {
  readonly problem: PrivateFileProblem;

  constructor(problem: PrivateFileProblem) {
    super(`Private file: ${problem}`);
    this.name = "PrivateFileError";
    this.problem = problem;
  }
}

export const PROBLEM_MESSAGES: Record<PrivateFileProblem, string> = {
  unavailable: "Files can't be shown: this build isn't connected to Convex.",
  signedOut: "Your session has ended. Sign in again to see this file.",
  forbidden: "Only the applicant and the admin can open this file.",
  notFound: "This file isn't there any more.",
  failed: "The file didn't load. Check the connection and try again.",
};

export function problemForStatus(status: number): PrivateFileProblem {
  if (status === 401) return "signedOut";
  if (status === 403) return "forbidden";
  return status === 404 ? "notFound" : "failed";
}

export interface PrivateFileDeps {
  /** The deployment's `.convex.site` URL, where HTTP actions live. */
  siteUrl: string | undefined;
  /** The signed-in person's Convex token, or null when signed out. */
  getToken: () => Promise<string | null>;
  fetch: (input: string, init: RequestInit) => Promise<Response>;
}

/** The file's bytes, typed as recorded when it was checked at upload. */
export async function fetchPrivateFile(
  file: { id: string; contentType: string },
  deps: PrivateFileDeps,
): Promise<Blob> {
  if (!deps.siteUrl) throw new PrivateFileError("unavailable");
  const token = await deps.getToken();
  if (!token) throw new PrivateFileError("signedOut");
  let response: Response;
  try {
    response = await deps.fetch(
      `${deps.siteUrl}/files/${encodeURIComponent(file.id)}`,
      { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" },
    );
  } catch {
    throw new PrivateFileError("failed");
  }
  if (!response.ok)
    throw new PrivateFileError(problemForStatus(response.status));
  const blob = await response.blob();
  return blob.type === file.contentType
    ? blob
    : new Blob([blob], { type: file.contentType });
}

/**
 * Remembers a token for a minute, and shares one request between the files
 * on a page. Convex tokens last longer than that; a failed one isn't kept.
 */
export function rememberToken(
  load: () => Promise<string | null>,
  ttlMs = 60_000,
  now: () => number = Date.now,
): () => Promise<string | null> {
  let kept: { token: string; at: number } | undefined;
  let pending: Promise<string | null> | undefined;
  async function refresh(): Promise<string | null> {
    try {
      const token = await load();
      kept = token ? { token, at: now() } : undefined;
      return token;
    } finally {
      pending = undefined;
    }
  }
  return async () => {
    if (kept && now() - kept.at < ttlMs) return kept.token;
    pending ??= refresh();
    return pending;
  };
}

async function loadConvexToken(): Promise<string | null> {
  const { data } = await authClient.convex.token({
    fetchOptions: { throw: false },
  });
  return data?.token ?? null;
}

const convexUrl = clientEnv.NEXT_PUBLIC_CONVEX_URL;

/** The real browser: this deployment, this session, `window.fetch`. */
export const browserFileDeps: PrivateFileDeps = {
  siteUrl:
    clientEnv.NEXT_PUBLIC_CONVEX_SITE_URL ??
    (convexUrl ? convexSiteUrlFrom(convexUrl) : undefined),
  getToken: rememberToken(loadConvexToken),
  fetch: (input, init) => fetch(input, init),
};

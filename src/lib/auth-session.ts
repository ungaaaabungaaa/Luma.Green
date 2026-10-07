import { z } from "zod";

const tokenResponse = z.object({ token: z.string().min(1) });

/** No credentials or response details belong in an availability error. */
export class AuthServiceUnavailable extends Error {
  constructor() {
    super("AUTH_SERVICE_UNAVAILABLE");
    this.name = "AuthServiceUnavailable";
  }
}

/** A transport failure is not proof that the caller has signed out. */
export async function hasAuthSession(siteUrl: string, incoming: Headers) {
  const headers = new Headers();
  for (const name of ["cookie", "authorization", "x-forwarded-for"]) {
    const value = incoming.get(name);
    if (value) headers.set(name, value);
  }
  headers.set("host", new URL(siteUrl).host);
  headers.set("accept-encoding", "identity");
  try {
    const response = await fetch(new URL("/api/auth/convex/token", siteUrl), {
      headers,
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(8000),
    });
    if (response.status === 401 || response.status === 403) return false;
    if (response.status !== 200) throw new AuthServiceUnavailable();
    const body: unknown = await response.json();
    if (!tokenResponse.safeParse(body).success)
      throw new AuthServiceUnavailable();
    return true;
  } catch {
    throw new AuthServiceUnavailable();
  }
}

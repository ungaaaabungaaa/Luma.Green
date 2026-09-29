// @vitest-environment node
import { describe, expect, it, vi } from "vitest";

import {
  fetchPrivateFile,
  type PrivateFileDeps,
  PrivateFileError,
  type PrivateFileProblem,
  rememberToken,
} from "./private-file";

const SITE = "https://glorious-rooster-470.convex.site";
const certificate = { id: "kg2abc123", contentType: "application/pdf" };

function deps(overrides: Partial<PrivateFileDeps> = {}): PrivateFileDeps {
  return {
    siteUrl: SITE,
    getToken: () => Promise.resolve("convex-jwt"),
    fetch: () =>
      Promise.resolve(
        new Response(new Blob(["%PDF-1.4"]), {
          status: 200,
          headers: { "Content-Type": "application/octet-stream" },
        }),
      ),
    ...overrides,
  };
}

async function problemOf(
  promise: Promise<unknown>,
): Promise<PrivateFileProblem> {
  try {
    await promise;
  } catch (error) {
    if (error instanceof PrivateFileError) return error.problem;
    throw error;
  }
  throw new Error("Expected the file request to fail");
}

describe("fetchPrivateFile", () => {
  it("asks the file route with the Convex token", async () => {
    const fetch = vi.fn<PrivateFileDeps["fetch"]>(deps().fetch);
    const blob = await fetchPrivateFile(certificate, deps({ fetch }));
    expect(fetch).toHaveBeenCalledWith(`${SITE}/files/kg2abc123`, {
      headers: { Authorization: "Bearer convex-jwt" },
      cache: "no-store",
    });
    // Typed as recorded at upload, whatever the response said.
    expect(blob.type).toBe("application/pdf");
    expect(await blob.text()).toBe("%PDF-1.4");
  });

  it("names each refusal so the viewer can explain it", async () => {
    const statuses: [number, PrivateFileProblem][] = [
      [401, "signedOut"],
      [403, "forbidden"],
      [404, "notFound"],
      [500, "failed"],
    ];
    for (const [status, problem] of statuses) {
      const refusing = deps({
        fetch: () => Promise.resolve(new Response(null, { status })),
      });
      expect(await problemOf(fetchPrivateFile(certificate, refusing))).toBe(
        problem,
      );
    }
  });

  it("doesn't ask without a token, or without a deployment", async () => {
    const fetch = vi.fn<PrivateFileDeps["fetch"]>();
    const signedOut = deps({ fetch, getToken: () => Promise.resolve(null) });
    const noDeployment = deps({ fetch, siteUrl: undefined });
    expect(await problemOf(fetchPrivateFile(certificate, signedOut))).toBe(
      "signedOut",
    );
    expect(await problemOf(fetchPrivateFile(certificate, noDeployment))).toBe(
      "unavailable",
    );
    expect(fetch).not.toHaveBeenCalled();
  });

  it("treats a dropped connection as a failure to retry", async () => {
    const offline = deps({
      fetch: () => Promise.reject(new TypeError("Failed to fetch")),
    });
    expect(await problemOf(fetchPrivateFile(certificate, offline))).toBe(
      "failed",
    );
  });
});

describe("rememberToken", () => {
  it("shares one request between files, and keeps the token a while", async () => {
    let clock = 0;
    const load = vi.fn(() => Promise.resolve("jwt-1"));
    const getToken = rememberToken(load, 60_000, () => clock);

    expect(await Promise.all([getToken(), getToken(), getToken()])).toEqual([
      "jwt-1",
      "jwt-1",
      "jwt-1",
    ]);
    expect(load).toHaveBeenCalledTimes(1);

    clock = 59_000;
    await getToken();
    expect(load).toHaveBeenCalledTimes(1);

    clock = 61_000;
    load.mockResolvedValueOnce("jwt-2");
    expect(await getToken()).toBe("jwt-2");
    expect(load).toHaveBeenCalledTimes(2);
  });

  it("asks again after a failed request", async () => {
    const load = vi
      .fn<() => Promise<string | null>>()
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce("jwt");
    const getToken = rememberToken(load);
    expect(await getToken()).toBeNull();
    expect(await getToken()).toBe("jwt");
  });
});

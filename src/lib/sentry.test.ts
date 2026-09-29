import { describe, expect, it } from "vitest";

import { privateDataCollection } from "./sentry";

describe("privateDataCollection", () => {
  it("switches off every category that could carry operator data", () => {
    // Sentry 11 defaults each of these to on. A category missing here is a
    // category silently collected, so the list is checked in full.
    expect(privateDataCollection).toEqual({
      userInfo: false,
      cookies: false,
      httpHeaders: false,
      httpBodies: [],
      urlQueryParams: false,
      graphQL: { document: false, variables: false },
      genAI: { inputs: false, outputs: false },
      databaseQueryData: false,
      queues: false,
      stackFrameVariables: false,
    });
  });
});

import type * as Sentry from "@sentry/nextjs";

type InitOptions = NonNullable<Parameters<typeof Sentry.init>[0]>;
type DataCollection = NonNullable<InitOptions["dataCollection"]>;

/**
 * What Sentry may collect: nothing about the person.
 *
 * Sentry 11 replaced `sendDefaultPii: false` with `dataCollection`, and every
 * category in it defaults to *on* — user info, cookies, headers, bodies, query
 * strings, DB parameters, local variables. Operators enter phone numbers, PAN,
 * GSTIN and payout details, so each category is switched off explicitly. Errors
 * and stack traces still arrive; the data around them does not.
 */
export const privateDataCollection = {
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
} as const satisfies DataCollection;

import type {
  ErrorEvent,
  getDefaultIntegrations,
  StackFrame,
} from "@sentry/nextjs";

import { clientEnv } from "@/lib/env";

type Integration = ReturnType<typeof getDefaultIntegrations>[number];

export function isMonitoringEnabled(): boolean {
  return Boolean(
    clientEnv.NEXT_PUBLIC_TELEMETRY_ENABLED &&
    clientEnv.NEXT_PUBLIC_SENTRY_DSN?.trim(),
  );
}

const errorTypes = new Set([
  "Error",
  "TypeError",
  "RangeError",
  "ReferenceError",
  "SyntaxError",
  "URIError",
  "EvalError",
  "AggregateError",
  "ConvexError",
  "APIError",
]);

/** Keep code locations, never absolute host paths, URL tokens or source contents. */
function scrubFrame(frame: StackFrame): StackFrame {
  const filename = frame.filename?.split(/[?#]/, 1)[0];
  const sourcePath = filename?.match(
    /(?:^|\/)((?:src|_next\/static)\/[\w./[\]()-]+\.[cm]?[jt]sx?)$/,
  )?.[1];
  const basename = filename?.split("/").at(-1);
  const safeFilename =
    sourcePath ??
    (basename && /^[\w.-]+\.[cm]?[jt]sx?$/.test(basename)
      ? basename
      : undefined);
  return {
    filename: safeFilename,
    function:
      frame.function && /^[\w.$<> [\]-]{1,120}$/.test(frame.function)
        ? frame.function
        : undefined,
    lineno: frame.lineno,
    colno: frame.colno,
    in_app: frame.in_app,
  };
}

/** An allowlist protects new SDK fields as well as today's known private fields. */
export function scrubMonitoringEvent(event: ErrorEvent): ErrorEvent | null {
  const values = event.exception?.values;
  if (!values?.length) return null;
  return {
    type: undefined,
    event_id: event.event_id,
    timestamp: event.timestamp,
    platform: event.platform,
    level: event.level,
    release: event.release,
    dist: event.dist,
    environment: event.environment,
    exception: {
      values: values.map((exception) => ({
        type: errorTypes.has(exception.type ?? "") ? exception.type : "Error",
        value: "Error details removed for privacy",
        stacktrace: exception.stacktrace
          ? {
              frames: exception.stacktrace.frames?.map((frame) =>
                scrubFrame(frame),
              ),
            }
          : undefined,
      })),
    },
  };
}

export function monitoringOptions() {
  return {
    dsn: clientEnv.NEXT_PUBLIC_SENTRY_DSN,
    enabled: isMonitoringEnabled(),
    sendDefaultPii: false,
    tracesSampleRate: 0,
    tracePropagationTargets: [],
    profilesSampleRate: 0,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,
    enableLogs: false,
    sendClientReports: false,
    maxBreadcrumbs: 0,
    includeLocalVariables: false,
    beforeSend: scrubMonitoringEvent,
    integrations: (integrations: Integration[]) =>
      integrations.filter(
        ({ name }) =>
          ![
            "BrowserSession",
            "ProcessSession",
            "Breadcrumbs",
            "HttpContext",
            "RequestData",
            "ContextLines",
            "LocalVariables",
          ].includes(name),
      ),
  };
}

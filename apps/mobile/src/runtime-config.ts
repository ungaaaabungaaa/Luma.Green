import { appOrigin, DEFAULT_APP_URL } from "../origin.cjs";

export function runtimeOrigin(extra: unknown, isDevelopment: boolean): string {
  if (!extra || typeof extra !== "object") return DEFAULT_APP_URL;
  const origin =
    "appOrigin" in extra && typeof extra.appOrigin === "string"
      ? extra.appOrigin
      : DEFAULT_APP_URL;
  const isAllowLocalHttp =
    isDevelopment && "allowLocalHttp" in extra && extra.allowLocalHttp === true;
  return appOrigin(origin, isAllowLocalHttp);
}

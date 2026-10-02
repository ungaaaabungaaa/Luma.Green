import { httpRouter } from "convex/server";

import { authComponent, createAuth } from "./auth";
import { FILES_PATH, preflight, serve } from "./files";
import { serve as serveIntegration } from "./integrationHttp";
import { INTEGRATION_PATH } from "./lib/integrationHttp";

const http = httpRouter();

// Better Auth's endpoints; Next.js proxies /api/auth/* here.
authComponent.registerRoutes(http, createAuth);

// Private files, checked on every request (convex/files.ts).
http.route({ pathPrefix: FILES_PATH, method: "GET", handler: serve });
http.route({ pathPrefix: FILES_PATH, method: "OPTIONS", handler: preflight });

// REST v1 uses scoped machine credentials, independent of browser sessions.
for (const method of [
  "GET",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
  "OPTIONS",
] as const) {
  http.route({
    pathPrefix: INTEGRATION_PATH,
    method,
    handler: serveIntegration,
  });
}

export default http;

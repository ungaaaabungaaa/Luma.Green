import { httpRouter } from "convex/server";

import { authComponent, createAuth } from "./auth";
import { FILES_PATH, preflight, serve } from "./files";

const http = httpRouter();

// Better Auth's endpoints; Next.js proxies /api/auth/* here.
authComponent.registerRoutes(http, createAuth);

// Private files, checked on every request (convex/files.ts).
http.route({ pathPrefix: FILES_PATH, method: "GET", handler: serve });
http.route({ pathPrefix: FILES_PATH, method: "OPTIONS", handler: preflight });

export default http;

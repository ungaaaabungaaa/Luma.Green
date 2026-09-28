import { httpRouter } from "convex/server";

import { authComponent, createAuth } from "./auth";

const http = httpRouter();

// Better Auth's endpoints; Next.js proxies /api/auth/* here.
authComponent.registerRoutes(http, createAuth);

export default http;

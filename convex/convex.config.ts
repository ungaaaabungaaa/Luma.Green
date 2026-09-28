import { defineApp } from "convex/server";

import betterAuth from "./betterAuth/convex.config";

const app = defineApp();

// Better Auth keeps its users, sessions, SMS codes and two-factor secrets in
// this component's own tables — see docs/architecture/auth.md. Installed
// locally (convex/betterAuth/) so its schema matches our plugins.
app.use(betterAuth);

export default app;

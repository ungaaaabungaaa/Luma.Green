import { authServer } from "@/lib/auth-server";

/** Better Auth's endpoints, proxied to the Convex deployment. */
function notConfigured(): Response {
  return Response.json(
    { error: "Sign-in is not configured on this deployment." },
    { status: 503 },
  );
}

export async function GET(request: Request): Promise<Response> {
  return authServer ? authServer.handler.GET(request) : notConfigured();
}

export async function POST(request: Request): Promise<Response> {
  return authServer ? authServer.handler.POST(request) : notConfigured();
}

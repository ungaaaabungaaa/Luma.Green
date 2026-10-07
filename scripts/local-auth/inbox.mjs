import { randomUUID, timingSafeEqual } from "node:crypto";
import { createServer } from "node:http";

const secret = process.env.AUTH_LOCAL_EMAIL_INBOX_TOKEN;
if (!secret || secret.length < 32 || /[\r\n]/.test(secret))
  throw new Error(
    "Set AUTH_LOCAL_EMAIL_INBOX_TOKEN to at least 32 characters.",
  );
const port = Number(process.env.AUTH_LOCAL_EMAIL_INBOX_PORT ?? 3215);
if (!Number.isSafeInteger(port) || port < 1024 || port > 65_535)
  throw new Error("Invalid inbox port.");
const expected = Buffer.from(`Bearer ${secret}`);
const messages = new Map();
function expireMessages() {
  for (const [id, message] of messages)
    if (message.expiresAt <= Date.now()) messages.delete(id);
}

const server = createServer(async (request, response) => {
  response.setHeader("Cache-Control", "no-store");
  response.setHeader("Content-Type", "application/json");
  const auth = Buffer.from(request.headers.authorization ?? "");
  const finish = (status, data) => {
    response.writeHead(status);
    response.end(JSON.stringify(data));
  };
  if (auth.length !== expected.length || !timingSafeEqual(auth, expected))
    return finish(401, { error: "Unauthorized" });
  // No browser CORS support. Messages expire in 15 minutes and stay in memory.
  if (request.headers.origin)
    return finish(403, { error: "Runner access only" });
  expireMessages();
  const url = new URL(request.url ?? "/", `http://127.0.0.1:${port}`);
  if (request.method === "GET" && url.pathname === "/messages") {
    const to = url.searchParams.get("to");
    return finish(200, {
      messages: messages
        .values()
        .filter((m) => !to || m.to === to)
        .toArray(),
    });
  }
  if (request.method === "DELETE" && url.pathname === "/messages") {
    messages.clear();
    return finish(200, { status: true });
  }
  if (request.method !== "POST" || url.pathname !== "/deliver")
    return finish(404, { error: "Not found" });
  let body = "";
  for await (const chunk of request) {
    body += chunk.toString();
    if (body.length > 32_768) return finish(413, { error: "Too large" });
  }
  try {
    const input = JSON.parse(body);
    if (
      !input ||
      typeof input.to !== "string" ||
      typeof input.subject !== "string" ||
      typeof input.text !== "string" ||
      ![
        "verification",
        "password-reset",
        "workspace-invitation",
        "phone-code",
      ].includes(input.kind)
    )
      return finish(400, { error: "Invalid message" });
    if (messages.size >= 200) return finish(429, { error: "Inbox full" });
    const id = randomUUID();
    messages.set(id, { ...input, id, expiresAt: Date.now() + 900_000 });
    return finish(200, { id });
  } catch {
    return finish(400, { error: "Invalid message" });
  }
});
server.listen(port, "127.0.0.1", () => {
  process.stdout.write(
    `Local auth inbox listening on 127.0.0.1:${port}. Message contents are never logged.\n`,
  );
});

import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { once } from "node:events";
import { createServer } from "node:net";
import test from "node:test";

async function availablePort() {
  const socket = createServer();
  socket.listen(0, "127.0.0.1");
  await once(socket, "listening");
  const address = socket.address();
  assert.ok(address && typeof address !== "string");
  const port = address.port;
  await new Promise((resolve, reject) => {
    socket.close((error) => {
      if (error) reject(error);
      else resolve();
    });
  });
  return port;
}

await test("local inbox requires runner authorization and never prints delivered credentials", async (context) => {
  const secret = randomBytes(32).toString("hex");
  const port = await availablePort();
  const child = spawn(
    process.execPath,
    [new URL("inbox.mjs", import.meta.url).pathname],
    {
      env: {
        ...process.env,
        AUTH_LOCAL_EMAIL_INBOX_TOKEN: secret,
        AUTH_LOCAL_EMAIL_INBOX_PORT: String(port),
      },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  context.after(() => {
    child.kill();
  });
  let output = "";
  child.stdout.on("data", (data) => {
    output += String(data);
  });
  child.stderr.on("data", (data) => {
    output += String(data);
  });
  await once(child.stdout, "data");
  const origin = `http://127.0.0.1:${port}`;
  const headers = {
    Authorization: `Bearer ${secret}`,
    "Content-Type": "application/json",
  };
  const request = (path, options) => fetch(`${origin}${path}`, options);
  assert.equal(await responseStatus(request("/messages")), 401);
  assert.equal(
    await responseStatus(
      request("/messages", {
        headers: { ...headers, Origin: "http://localhost:3100" },
      }),
    ),
    403,
  );
  assert.equal(
    await responseStatus(
      request("/deliver", { method: "POST", headers, body: "not json" }),
    ),
    400,
  );
  const oversizedBody = "x".repeat(32_769);
  assert.equal(
    await responseStatus(
      request("/deliver", {
        method: "POST",
        headers,
        body: oversizedBody,
      }),
    ),
    413,
  );
  const text = "456789";
  const message = {
    to: "+919000000231",
    subject: "Local phone verification",
    text,
    kind: "phone-code",
  };
  const messageBody = JSON.stringify(message);
  assert.equal(
    await responseStatus(
      request("/deliver", {
        method: "POST",
        headers,
        body: messageBody,
      }),
    ),
    200,
  );
  const received = await request("/messages?to=%2B919000000231", { headers });
  assert.equal(received.headers.get("cache-control"), "no-store");
  const result = await received.json();
  assert.equal(result.messages.length, 1);
  assert.equal(result.messages[0].text === text, true);
  assert.equal(output.includes(secret), false);
  assert.equal(output.includes(text), false);
  assert.equal(output.includes(message.to), false);
  assert.equal(
    await responseStatus(request("/messages", { method: "DELETE", headers })),
    200,
  );
  const empty = await request("/messages", { headers });
  assert.deepEqual(await empty.json(), { messages: [] });
});

async function responseStatus(pending) {
  const response = await pending;
  return response.status;
}

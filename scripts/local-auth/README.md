# Local auth delivery inbox

Run only with disposable test accounts and a local Convex backend. The server
binds to `127.0.0.1`. It holds messages in memory for 15 minutes, accepts at most
200 messages and prints no addresses, tokens or links.

Set a random `AUTH_LOCAL_EMAIL_INBOX_TOKEN` of at least 32 characters privately in
the runner process, then run `node scripts/local-auth/inbox.mjs`. Default port:
3215; optional `AUTH_LOCAL_EMAIL_INBOX_PORT` changes it.

Configure the **local Convex runtime**, without committing secrets:

- `SITE_URL=http://localhost:3000` (use the actual local web port).
- `AUTH_LOCAL_TEST_MODE=true`.
- `AUTH_LOCAL_EMAIL_INBOX_URL=http://127.0.0.1:3215/deliver`.
- `AUTH_LOCAL_EMAIL_INBOX_TOKEN`: the same private runner token.

Convex's system `CONVEX_SITE_URL` must also be a loopback HTTP origin. Cloud dev,
preview and production backends cannot use this path. Browser flags do not
participate in this decision. Local mode sends the real library-generated token;
it never sets `emailVerified` or creates a session itself.

The secured runner uses `Authorization: Bearer <token>` for every request:

- `POST /deliver`: `{to, subject, text, kind}`. Response: `{id}`.
  `kind` is `verification`, `password-reset`, `workspace-invitation` or
  `phone-code`. For phone codes, `to` is the E.164 number and `text` is the
  actual six-digit code from Better Auth. No fixed code is installed.
- `GET /messages?to=<encoded-email>`: `{messages: [{id,to,subject,text,kind,expiresAt}]}`.
- `DELETE /messages`: clear messages. Response: `{status:true}`.

Read the verification or reset URL from `text` in memory and drive the actual
browser/Better Auth handler. Do not print it, save it to the guide, or put it in
shell history. Requests with an Origin header are denied. There is no CORS
permission. The inbox token is not an account credential and must never be sent
to the browser. Restarting the runner deletes all messages.

Run the local runner boundary test with `node --test scripts/local-auth/inbox.test.mjs`.
It uses a new loopback port and a temporary in-memory bearer token. It does not
connect to Convex or a mail provider.

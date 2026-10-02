# Industry API access

> **Status:** REST v1 implementation, 2 October 2026. Local checks, hosted checks
> and production verification are separate. See the [delivery handoff](../delivery/handoff.md)
> for completed evidence. [ADR 0018](../decisions/0018-scoped-industry-rest-api.md)
> records the protocol and access decision.

## Purpose and release scope

Approved businesses can connect their ERP, stock or reporting system to
Luma.Green. REST v1 reads the business profile, material catalogue, recorded
inventory and trade records. Optional industry news returns source links for the
business's material families. A factory can compare the recorded stock with its
ERP and import its purchases. A recycler can report its recorded material sales.

The API uses the same records as the application. It does not create stock,
orders or payments. Trade payment and escrow states remain simulated. Material
records and indicative impact factors do not certify carbon credits or establish
regulatory compliance. General API access does not approve a business to handle
hazardous or specialised waste streams.

## Industry uses

Use the same API for all four current business kinds: kabadiwala, yard, recycler
and manufacturer. Material codes, role and location remain the business model;
an industry name does not grant more permissions.

| Industry or operator                                  | Useful with REST v1                                        | Further records required for a fuller integration                   |
| ----------------------------------------------------- | ---------------------------------------------------------- | ------------------------------------------------------------------- |
| Scrap shops and collection firms                      | Compare recorded stock and sale records with a stock book  | Weighbridge receipts, vehicle dispatch and stock movements          |
| Sorting yards                                         | Import purchase and sale records; reconcile material stock | Sorting runs, rejects and mass balance                              |
| Plastic recyclers and packaging factories             | Match plastic and recycled-material codes to ERP items     | Polymer grade, contamination tests and batch certificates           |
| Paper mills and packaging firms                       | Review paper procurement and stock                         | Moisture, paper grade and bale specifications                       |
| Metal recyclers and foundries                         | Reconcile material quantities and recorded purchases       | Alloy analysis, melt batches and recovery yield                     |
| Glass processors and manufacturers                    | Review glass procurement and recorded stock                | Colour, contamination and cullet specifications                     |
| Electronics recyclers                                 | Read supported catalogue and own business records          | Equipment or batch traceability and verified treatment records      |
| Textile, rubber, construction and organic-waste firms | Evaluate the shared access contract                        | Supported material codes and domain workflows must be defined first |

The current material families are paper, plastic, metal, glass, ewaste and other.
Only active catalogue codes are returned. The `other` family is not approval for
an unsupported material. Agree on its code, evidence and workflow before use.

## Create a connection

1. Complete business approval and sign in as the owner. Staff and Saathis cannot
   manage API keys. Open **Compliance**, then **API access** (`/app/integrations`).
2. Enter a name that identifies the receiving system, such as Factory ERP.
3. Select only the read permissions that system needs.
4. Choose an expiry of 1, 7, 30 or 90 days. The default is 30 days.
   The backend accepts any whole number from 1 to 90 days.
5. Create the key and copy it once into the receiving system's secret store.
   The key is not shown again. If it is lost, revoke it and create another.
6. Use the website origin followed by `/api/v1` as the base URL.
   Test an endpoint that the key can read. To check the business identity with
   `/organization`, include `organization:read` when creating the key.
7. Confirm the intended business in the owner screen, or in the organization
   response when that scope is granted, before importing inventory or trades.

An organization can have at most five active, unexpired keys. Use a separate key
for each system so one connection can be revoked without stopping the others.
A token starts with `lg_live_` and has 64 hexadecimal characters after that
prefix. The prefix is a token format, not evidence that a deployment is live.

Store keys only in server-side secret settings. Never put them in a browser
bundle, mobile app, URL, spreadsheet cell, source repository or support message.
The platform stores a SHA-256 digest and a display prefix. It does not retain the
full secret. Credential creation and revocation write audit records.

## Base URLs and authentication

The website API uses `/api/v1` without a language prefix. For a configured public
website, the base is `https://luma.green/api/v1`. Use the actual deployed origin
for your environment; this example does not prove that the domain is deployed.
The same routes are served directly by the corresponding Convex deployment at
`https://YOUR_DEPLOYMENT.convex.site/api/v1`. The `.convex.cloud` endpoint is not
the HTTP-action base. A key belongs to its issuing deployment.

Every data request needs `Authorization: Bearer KEY`. The OpenAPI document at
`GET /api/v1/openapi.json` is public. Cookies are not machine credentials.
Private responses use `Cache-Control: no-store`; an intermediary must not cache
business records. The website proxy forwards requests to the configured Convex
HTTP endpoint. Convex remains the permission and data authority.

## REST v1 contract

All routes below are relative to the base URL. Successful responses are JSON.
The checked-in OpenAPI document at `/api/v1/openapi.json` is the exact field and
error contract. Do not infer an API field from an internal Convex table.

| Method and path     | Required scope      | Result                                       |
| ------------------- | ------------------- | -------------------------------------------- |
| `GET /organization` | `organization:read` | The credential's business profile            |
| `GET /materials`    | `materials:read`    | Active material codes and labels             |
| `GET /inventory`    | `inventory:read`    | The business's recorded stock                |
| `GET /trades`       | `trades:read`       | The business's buying or selling records     |
| `GET /news`         | `news:read`         | Optional English headlines with source links |
| `GET /openapi.json` | None                | OpenAPI description and schemas              |

Material, inventory and trade list requests accept `limit`, an integer from 1 to
100, with a default of 50.
Use the response cursor for the next page. Treat a cursor as an opaque value;
do not edit it or reuse it for another endpoint or trade side. Trade requests
accept `side=buyer` or `side=seller`; buyer is the default. Read both sides when
reconciling a business that buys and sells. The API does not accept an
organization selector. A key can read only its assigned business.

The organization result is `{data: {id, name, kind, city, families}}`.
Materials contain `code`, `names`, `family` and `stage`. Inventory rows contain
`materialCode`, `grams` and `updatedAt`. Trade rows contain `id`, `side`,
`materialCode`, `grams`, `paisePerKg`, `totalPaise`, `status`, `createdAt`,
`updatedAt`, nullable `invoiceNo` and `paymentMode: "simulated"`. Epoch timestamps
are milliseconds.

List results use `{data: [...], pagination: {nextCursor, isDone}}`. Continue until
`isDone` is true, even if a material page is empty: inactive materials are filtered
from each page. A non-final page supplies `nextCursor`; pass it as `cursor`.

Money is integer paise. Mass is integer grams. A price per kilogram is expressed
in paise per kilogram. Convert only for display. Keep material codes as strings
and map them to local ERP item codes; translated material names are labels and
can change. Missing values do not mean zero.

## Request examples

The examples use a placeholder origin and read a key from a secret setting.
Do not paste a real key into shell history. Configure `LUMA_API_BASE` and
`LUMA_API_KEY` through your system's protected settings before running them.

```sh
curl --fail-with-body \
  --header "Authorization: Bearer $LUMA_API_KEY" \
  "$LUMA_API_BASE/organization"

curl --fail-with-body \
  --header "Authorization: Bearer $LUMA_API_KEY" \
  "$LUMA_API_BASE/inventory?limit=50"

curl --fail-with-body \
  --header "Authorization: Bearer $LUMA_API_KEY" \
  "$LUMA_API_BASE/trades?side=seller&limit=50"
```

This Python example imports every inventory page. It uses the standard library,
keeps credentials outside the program and fails on an HTTP error. Production
clients should handle `429` with the response's retry delay.

```python
import json
import os
from urllib.parse import urlencode
from urllib.request import Request, urlopen

base = os.environ["LUMA_API_BASE"].rstrip("/")
headers = {"Authorization": f"Bearer {os.environ['LUMA_API_KEY']}"}


def read_pages(resource, side=None):
    cursor = None
    while True:
        query = {"limit": 50}
        if side is not None:
            query["side"] = side
        if cursor is not None:
            query["cursor"] = cursor
        request = Request(f"{base}/{resource}?{urlencode(query)}", headers=headers)
        with urlopen(request, timeout=30) as response:
            page = json.load(response)
        yield from page["data"]
        if page["pagination"]["isDone"]:
            break
        cursor = page["pagination"]["nextCursor"]
        if not cursor:
            raise RuntimeError("The next page cursor is missing")


stock = list(read_pages("inventory"))
print(f"Imported {len(stock)} stock rows")
# For purchasing: list(read_pages("trades", side="buyer"))
```

## Reconcile safely

Pages are bounded snapshots read at the time of each request. Records can change
between pages. Cursor pagination is not a transaction spanning the whole import
and is not a guaranteed change feed. Do not treat an incomplete scan as proof
that stock or a trade was deleted.

Keep the Luma material code and record identifier alongside your local identifier.
Load all pages into a staging area, validate the quantities and business identity,
then reconcile. Repeat a full scan periodically. Where a concurrent update could
affect a business decision, read again or confirm it in the app. This API does
not provide guaranteed exactly-once events or automatic ERP write-back.

Each key can make 60 accepted data requests per minute across its endpoints.
The organization is also limited to 180 per minute across all keys. Limits use
fixed one-minute windows.
On `429`, wait for the `Retry-After` period and retry with bounded backoff. Do not
retry authorization or validation failures without correcting the cause. A
network error does not prove that the server was unavailable for every client.

## Access and errors

The server checks the key digest, expiry, revocation, active organization and the
issuer's current owner membership on every request. Removing the issuer's owner
membership or suspending the business stops the connection. A key cannot create
another key or change its own scopes. Key management requires a signed-in owner.
Accepted data reads write an audit event without the secret or record contents.

| Response | Operator action                                                   |
| -------- | ----------------------------------------------------------------- |
| `400`    | Correct invalid parameters or cursor; follow the OpenAPI contract |
| `401`    | Check the issuing deployment, token, expiry and revocation        |
| `403`    | Check required scope and current business-owner access            |
| `429`    | Wait for `Retry-After` and reduce the polling rate                |
| `503`    | Check the website's backend configuration or service availability |

Errors use `{error: {code}}`. The `X-Request-Id` response header identifies the
request. Keep the request ID, path, time and status when reporting an error. Remove the
Authorization header and private response data from logs. Household contact
information, onboarding files and other organizations' records are not exposed.

To rotate a key, create a replacement, install it in the receiving system, verify
a request, then revoke the old key. If five keys are already active, revoke an
unused key first. Revoke a leaked key immediately and inspect access records.

## Optional industry news

`GET /news?limit=10` uses the separate `news:read` permission. `limit` is a whole
number from 1 to 20; its default is 10. The endpoint has no cursor or trade side.
The server builds a query from the organization's recorded material families.
Clients cannot submit arbitrary provider queries or choose another business.

The response is `{data: [{title, url, source, publishedAt}], meta: {provider,
language, families, retrievedAt}}`. `provider` is `newsapi`; `language` is `en`.
`publishedAt` is the source publication time. `retrievedAt` is retrieval time in
epoch milliseconds. Preserve the publisher name, date and article link when
showing a headline. Open the original publisher for the article. The API does
not return or store full articles, snippets or images, and it does not fabricate
fallback news. An empty successful result means the provider returned no usable
items for this request; it does not prove that no relevant news exists.

News is off until the platform operator configures these Convex variables:

| Setting                     | Value                                  |
| --------------------------- | -------------------------------------- |
| `INDUSTRY_NEWS_ENABLED`     | `true` to enable the provider          |
| `INDUSTRY_NEWS_API_KEY`     | Secret NewsAPI credential; server only |
| `INDUSTRY_NEWS_DAILY_LIMIT` | Whole number 1–1000; default 100       |

Use a provider plan permitted for the intended production use. NewsAPI's free
Developer plan is for development and testing, not a production service.
Review the current [provider terms and plans](https://newsapi.org/pricing) before
activation. No subscription, account approval or live provider execution is
established by this code.

The server sends the provider secret in `X-Api-Key`, never in the request URL.
A global quota uses an anchored 24-hour window. A slot is reserved before each
upstream call; failed
calls count. The server does not automatically retry provider calls. Configuration
failure, exhausted quota or provider failure returns `503 NEWS_UNAVAILABLE`.
Do not replace that state with made-up headlines or treat it as an empty success.
The per-key and per-organization API limits still apply. News requests are audited
as requests; a request record does not prove that the provider returned news.

The current UI exposes the permission control, not a news feed screen. Material
news is an input for review; it is not an official regulatory notice, a purchase
recommendation or a guarantee of complete industry coverage.

## Deployment and verification

Deploy the additive schema and Convex functions before the frontend that uses
them. See the [migration note](../migrations/2026-10-02-industry-api.md).
A fresh clone without optional service settings still builds; the website API
returns its documented unavailable response when no backend is configured.

Before giving a factory production access, verify an owner-created test key on
the intended deployment. Check each permitted endpoint, one denied scope, expiry,
revocation, suspension and cross-business isolation. Confirm response units and
pagination with the receiving system. Check logs for secret leakage. Local mocks,
fixture screenshots and CI do not prove deployment or an external ERP connection.

## Planned extensions

1. Add a change feed and signed webhooks with event IDs, delivery retries, replay
   and a documented retention window. Keep full reconciliation available.
2. Add append-only inventory movements before accepting weighbridge or ERP stock
   writes. Define source references, units, correction rules and duplicate handling.
3. Add scoped listing and trade-request writes with transactional idempotency.
   Keep simulated payment actions out of a real payment contract.
4. Add batch specifications and provenance for agreed material streams. Verify
   required evidence before claiming certificates or regulatory reporting support.
5. Add a read-only MCP adapter when an agent client is selected. Reuse the API's
   authorization rules. Hosted OAuth needs protected-resource metadata, token
   audience checks and consent. Verify the selected protocol and SDK version.
6. Add GraphQL only for a demonstrated need for linked queries. Reuse the same
   service layer and add field access, pagination, depth and query-cost limits.

No delivery date is committed for these extensions. REST v1 remains read-only.

## Protocol references

- [Convex HTTP actions](https://docs.convex.dev/functions/http-actions) describe the HTTP routing and explicit request-validation boundary.
- [OpenAPI 3.1.2](https://spec.openapis.org/oas/v3.1.2.html) is the compatibility target for this contract.
- [MCP authorization](https://modelcontextprotocol.io/specification/2026-07-28/basic/authorization) and [transports](https://modelcontextprotocol.io/specification/2026-07-28/basic/transports) define future hosted-client requirements.
- [GraphQL security](https://graphql.org/learn/security/) explains demand controls for a future graph adapter.

- [NewsAPI Everything](https://newsapi.org/docs/endpoints/everything) and [authentication](https://newsapi.org/docs/authentication) define the optional headline source.

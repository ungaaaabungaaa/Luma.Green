# Scheduled public environment data

Status: MET Norway fetches verified in development and production on 2 October 2026. Weather crons are enabled in both deployments. Development cache records
show successful scheduled refreshes for Delhi and Mumbai; production records
show the same for Hyderabad and Kolkata. Sources remain disabled without
configuration; CPCB/data.gov.in is disabled because its API key
and verified resource ID are missing. The production backend is deployed; the
new frontend has not been deployed or merged.

## What the service does

The Services page shows coarse area forecasts and public station readings.
It supports Bengaluru, Delhi, Mumbai, Chennai, Hyderabad and Kolkata. The city
registry is `convex/lib/publicData.ts`. Requests use these fixed city centres,
never a household address, device position or signed-in person's location.

| Source                          | Data shown                                                                                                                                       | Connection                                                 |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------- |
| MET Norway Locationforecast 2.0 | Temperature in Celsius, relative humidity, wind in metres per second, next-hour precipitation in millimetres, forecast time and model issue time | No API key; identifying User-Agent is required             |
| CPCB through data.gov.in        | Station name, pollutant identifier, reported average, supplied unit and reading time                                                             | Operator API key and a verified resource UUID are required |

Weather is a forecast. It is not a sensor measurement at the selected city
centre or work site. The air adapter does not calculate Indian AQI, US AQI or
European AQI. It does not infer a concentration unit from a pollutant name.
If the provider omits a unit or supplies `NA`, the page says that the unit was
not supplied. Missing readings do not prove safe air or safe working conditions.

## Source and licence evidence

Sources checked on 2 October 2026:

- [MET Norway Locationforecast documentation](https://api.met.no/weatherapi/locationforecast/2.0/documentation)
  documents a global coordinate forecast and its compact JSON endpoint.
- [MET Norway licence policy](https://docs.api.met.no/doc/License.html) identifies
  MET Norway attribution and CC BY 4.0 / NLOD 2.0 licensing. The page links
  [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/), which permits
  commercial reuse under its conditions. The Services page identifies the
  source and explains that this is a selected city forecast.
- [MET Norway service terms](https://docs.api.met.no/doc/TermsOfService.html)
  require application identification, cache handling and controlled traffic.
  The terms accept an identifying GitHub project URL. Requests use conditional
  GET and respect `Expires`. The source provides no SLA.
- [CPCB's data.gov.in catalogue](https://www.data.gov.in/catalog/real-time-air-quality-index)
  describes station data from field instruments. [OGD terms](https://www.data.gov.in/terms-of-use)
  require attribution and checking each resource's licence metadata.
  [GODL India](https://ap.data.gov.in/godl) permits lawful commercial reuse of
  covered data subject to attribution and other conditions.

The detailed CPCB resource page returned HTTP 503 during research. A live schema,
dataset UUID, resource licence and API entitlement have therefore **not** been
confirmed. The adapter accepts the documented common station field shape and
has fixture tests. Keep it disabled until an operator checks the chosen current
resource in the official catalogue. Do not copy a public sample key or use an
unrelated dataset to make the connection appear active.

## Optional Convex environment

All settings are server-only, validated by `publicDataEnv()` in `src/lib/env.ts`.
Set them on the intended Convex deployment, not as `NEXT_PUBLIC_*` variables.

| Variable                      | Meaning                                                                                 |
| ----------------------------- | --------------------------------------------------------------------------------------- |
| `PUBLIC_DATA_ENABLED`         | Only the exact value `true` allows network work                                         |
| `MET_NORWAY_USER_AGENT`       | Application identity plus a working HTTPS project/contact page or email; no line breaks |
| `DATA_GOV_IN_API_KEY`         | Operator's own approved OGD API key                                                     |
| `DATA_GOV_IN_AIR_RESOURCE_ID` | Verified UUID for the current CPCB station resource                                     |

Each source needs its own valid settings. Weather can operate while CPCB stays
disabled. Unset, blank or invalid settings cause no provider request. The UI
keeps official source links available when data is disabled or unavailable.

## Schedule, cost and failure limits

`convex/crons.ts` has one hourly job per city, at minutes 7, 15, 23, 31, 39 and
47 UTC. The job calls only an internal action. Public queries read the cache
and cannot trigger a fetch. A transactional source/city claim permits no more
than one attempt per source per hour, including manual internal calls and
overlapping scheduled runs. Provider expiry can make that interval longer.

With both sources enabled, the ceiling is 12 HTTP requests per hour and 288
per day. There is no pagination fan-out: CPCB requests at most 100 records per
city and marks partial coverage. Each HTTP response has a 10-second timeout,
a 256 KiB body limit and no redirects. The hostnames are fixed in code. City
selectors cannot supply an external URL or arbitrary coordinates.

The cache has at most twelve rows, one per source/city. The final outcome is
audited; responses, API keys and request URLs are not written to audit records.
Errors store only a fixed failed state. Ordinary Convex execution, storage and
bandwidth costs still apply. No paid provider account is created by this code.

A failed response leaves the previous reading, successful fetch time and source
time unchanged. An older successful source response cannot replace a newer one.
A late action cannot overwrite a later claim. A weather HTTP 304 confirms the
cache and updates its fetch time, but never changes the model issue time or the
forecast's valid time.

The page recalculates freshness every minute. Weather becomes stale if the
selected forecast is more than one hour from now, the source issue time is more
than twelve hours old, or the successful fetch is more than two hours old.
Air becomes stale when its oldest displayed reading is more than three hours
old, or the fetch is more than two hours old. Data more than 24 hours old is
unavailable. Each station retains its own timestamp. Successful HTTP transport
does not make old measurements current.

## Verified development fetch

The development deployment returned a real MET Norway forecast for Bengaluru.
The cache reported `fresh` at the verification time below. All displayed times
in this record use India Standard Time (UTC+05:30).

| Field                         | Verified value                                                                   |
| ----------------------------- | -------------------------------------------------------------------------------- |
| Fetch time                    | 2 October 2026, 12:27:48.281 IST (`1790924268281` milliseconds since Unix epoch) |
| Source issue time             | 2 October 2026, 10:50:36 IST (`1790918436000`)                                   |
| Forecast valid time           | 2 October 2026, 12:30:00 IST (`1790924400000`)                                   |
| Selected city                 | Bengaluru                                                                        |
| Temperature                   | 28.2 °C                                                                          |
| Weather state at verification | `fresh`                                                                          |
| Air state                     | `disabled`; API key and verified CPCB resource ID missing                        |

Development has `PUBLIC_DATA_ENABLED=true` and this identifying User-Agent:
`Luma.Green/0.1 https://github.com/ungaaaabungaaa/Luma.Green`. The referenced
[project repository](https://github.com/ungaaaabungaaa/Luma.Green) was verified as
public for this source setup. The hourly weather schedule is enabled. The later development
cache readback contains these successful refreshes:

| City   | Successful fetch time in IST                   | Source issue time in IST                   | Cache result |
| ------ | ---------------------------------------------- | ------------------------------------------ | ------------ |
| Delhi  | 2 October 2026, 12:45:37.396 (`1790925337396`) | 2 October 2026, 10:50:37 (`1790918437000`) | `ok`         |
| Mumbai | 2 October 2026, 12:53:03.245 (`1790925783245`) | 2 October 2026, 10:50:01 (`1790918401000`) | `ok`         |

No manual refresh was run for Delhi or Mumbai during this verification session.
Their cache timestamps align with the city cron schedule, which supports
scheduled execution for those two development cities. The local readback is
`/private/tmp/luma-ecosystem-dev-cron-proof.json`. This is a sampled result;
continuous operation and successful fetches for all six cities are not yet
verified.

## Verified production fetch

The additive backend deploy to `outstanding-buzzard-942` completed successfully
on 2 October 2026. Schema validation passed and no indexes were deleted.
Production has `PUBLIC_DATA_ENABLED=true` and the same identifying User-Agent:
`Luma.Green/0.1 https://github.com/ungaaaabungaaa/Luma.Green`.

The production internal refresh returned this real MET Norway forecast for
Bengaluru. The cache was `fresh` when read back:

| Field                         | Verified value                                            |
| ----------------------------- | --------------------------------------------------------- |
| Fetch time                    | 2 October 2026, 13:04:30.325 IST (`1790926470325`)        |
| Source issue time             | 2 October 2026, 12:51:51 IST (`1790925711000`)            |
| Forecast valid time           | 2 October 2026, 13:30:00 IST (`1790928000000`)            |
| Temperature                   | 28.4 °C                                                   |
| Relative humidity             | 49.7%                                                     |
| Wind                          | 3.6 metres per second                                     |
| Next-hour precipitation       | 0 millimetres                                             |
| Weather state at verification | `fresh`                                                   |
| Air state                     | `disabled`; API key and verified CPCB resource ID missing |

The local execution evidence is
`/private/tmp/luma-ecosystem-prod-deploy.log` and
`/private/tmp/luma-ecosystem-prod-weather-proof.json`. This verifies the sampled
production provider request and cache readback.

The subsequent production cache readback contains these scheduled refreshes:

| City      | Successful fetch time in IST                   | Source issue time in IST                   | Forecast valid time in IST              | Cache result |
| --------- | ---------------------------------------------- | ------------------------------------------ | --------------------------------------- | ------------ |
| Hyderabad | 2 October 2026, 13:09:22.201 (`1790926762201`) | 2 October 2026, 12:51:41 (`1790925701000`) | 2 October 2026, 13:30 (`1790928000000`) | `ok`         |
| Kolkata   | 2 October 2026, 13:17:25.257 (`1790927245257`) | 2 October 2026, 12:51:41 (`1790925701000`) | 2 October 2026, 13:30 (`1790928000000`) | `ok`         |

No manual refresh was run for Hyderabad or Kolkata during this verification
session. Their successful cache timestamps align with the configured schedule.
The local evidence is `/private/tmp/luma-ecosystem-prod-cron-proof.json`.
This verifies sampled scheduled execution in production. Continuous operation,
successful refreshes for every production city and a deployed frontend view
remain separate checks. The frontend changes have not been deployed or merged.

Both backends were deployed again after the admin support count was changed to
include chats. The production redeploy completed with schema validation and no
index deletion; its log is `/private/tmp/luma-ecosystem-prod-final-deploy.log`.
The development redeploy completed, but its log reports nine deleted indexes in
`inbox`, `pushDevices`, `pushDeliveries` and `pushLimits`. Shared development
schema coordination needs review; this development redeploy is not described
as additive. Its log is `/private/tmp/luma-ecosystem-dev-final-deploy.log`.

## Before enabling a deployment

1. Verify the operator's provider identity/contact details, current terms and
   resource entitlement. Confirm CPCB resource UUID, field units and licence.
2. Deploy the schema, functions and crons to the intended environment. Configure
   only the sources that passed the source checks.
3. Run the internal refresh for one city. Verify the returned source times,
   units, station/city match and a real source response against the official site.
4. Verify a second call is rate-limited, no secrets appear in logs, the UI reports
   unavailable data correctly, and the next scheduled refresh occurs.
5. Record deployment, timestamp, source acceptance and browser evidence in the
   delivery handoff. Do not present mocked tests or guide fixtures as this proof.

For rollback, set `PUBLIC_DATA_ENABLED=false`. This stops new network requests
and hides cached values while retaining source links and the audit history.

## Further public data

The first scheduled scope is environment data. Government rules, legal aid,
worker schemes, MSME registration and EPR portals remain attributed links.
They do not have a verified stable feed contract in this implementation.
Do not scrape legal text into automatic legal conclusions or assign eligibility
from an old page. Scrap prices require a licensed, current market feed; public
environment data must not be used to invent material rates or carbon factors.

Any additional source needs an identified publisher, commercial-use terms,
stable API/schema, update interval, source timestamp, cache limit, failure state
and acceptance test before a cron is added. This is the same public-data path;
do not create a second scheduler or a browser-side fetch loop.

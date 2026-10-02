# 0018 Scoped industry REST API

- **Status:** Decided
- **Date:** 2 October 2026
- **Decider:** founder's request for industry system access

## Context

Factories and other approved businesses need to import Luma.Green stock and trade
records into their own systems. Browser sessions are unsuitable as shared machine
credentials. The pilot has simulated business payment states and no general
external stock-ingestion ledger.

## Decision

Expose a versioned, read-only REST API with an OpenAPI contract. Convex owns
credentials, authorization and data reads; Next.js provides a same-origin proxy.
Return explicit organization, material, inventory and trade views with bounded
pagination. Add optional, source-attributed news through a separately scoped
provider action with a hard global quota and no invented fallback results. Keep units in integer grams and paise.

Only an active organization's owner can issue or revoke scoped, expiring keys.
Generate 256-bit secrets, display them once and store only their SHA-256 digest
and display prefix. Check the organization and issuer's current owner membership
on every request. Bound live keys and request rates; audit credential changes and
accepted reads without recording secrets. No caller can select another business.

Use REST across the current chain and material families. Stage webhooks and writes
after provenance and retry rules are defined. Add MCP or GraphQL only as adapters
over the same permission rules when a real client requires them.

## Consequences

ERP and reporting clients can reconcile records without handling human login.
They must protect and rotate credentials and tolerate changing snapshot pages.
The service takes on key lifecycle, rate-limit and versioned-contract maintenance.

Read-only access does not grant permission to handle specialised waste, process
payments or certify carbon credits. Hosted checks, deployment, and a customer's
successful connection each require separate evidence. See the
[industry API runbook](../architecture/industry-api.md).

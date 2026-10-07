# Roles

> **Status:** approved requirements reconciled on 6 October 2026. Implementation
> and browser acceptance are in progress. The
> [requirements record](platform-refinement-interview.md) owns decisions and
> open questions. The [10 October test plan](../testing/launch-2026-10-10.md)
> lists required journeys; this page does not claim they have passed.

A participant type describes a person's or organisation's work. A workspace
role controls what a member can do within it. Signup, organisation approval and
permission to see private records are separate checks.

## Participants

| Participant                                                            | Work on Luma.Green                                                                                   | Main device       | Access boundary                                                                                    |
| ---------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | ----------------- | -------------------------------------------------------------------------------------------------- |
| **Household member**                                                   | Enter scrap, compare offers, book, track and read own receipt                                        | Phone             | Verified account for protected actions; only own records                                           |
| **Household coordinator**                                              | Coordinate collection where the household grants access                                              | Phone             | Duties remain open; no automatic access to all households, buying role or payment authority        |
| **Kabadiwala**                                                         | Buy household scrap, weigh, pay directly, record stock and offer permitted material                  | Phone             | Business approval plus current workspace permission                                                |
| **Preprocessor**                                                       | Receive, inspect and sort material; record supported quality/custody evidence and offers             | Phone and desktop | “Yard” describes a site; approval and material eligibility apply                                   |
| **Recycler**                                                           | Receive accepted material and record supported output and quality evidence                           | Mostly desktop    | Evidence alone creates no stock, process yield or certificate                                      |
| **Manufacturer**                                                       | Buy inputs and offer non-hazardous recyclable byproducts to an approved buyer handling that material | Mostly desktop    | Buyer eligibility follows approval and material; the prototype's next-role-only rule is superseded |
| **Fibre, textile and garment manufacturers**                           | Use approved subtype workflows and evidence fields where implemented                                 | Mostly desktop    | Test each subtype; do not assume a conversion screen exists                                        |
| **Apartment community, office, hotel and resort**                      | Record sites, material origin and supported offers as non-household material generators              | Phone and desktop | Test each source type; classification grants no automatic trading permission                       |
| **Apparel brand, packaging brand or PIBO**                             | Use authorised reports and compliance evidence                                                       | Mostly desktop    | A requested type does not prove a distinct business workflow or legal approval                     |
| **Saathi**                                                             | Take permitted pickup or site jobs and record own completion                                         | Phone             | Assigned work only; no automatic customer-finance or unrelated-job access                          |
| **City official, CSR sponsor, lender, auditor and waste-picker union** | Read purpose-limited information granted by the data owner                                           | Mostly desktop    | Approved observer account plus an explicit data grant; no default private-data or trade access     |
| **Platform administrator**                                             | Review applications and perform permitted, audited platform operations                               | Desktop           | Separate configured identity with required TOTP; no silent customer-workspace membership           |

“Non-household material generators” describes a source group. It does not create
a legal entity type, licence or trade permission. Read [onboarding](onboarding.md)
with the current requirements record; older role lists do not reduce test scope.

## Accounts and sign-in

The approved normal-user methods are verified email/password and phone OTP.
Households can have accounts; the old “households never register” rule is
superseded. Private booking, security and inbox actions require the appropriate
verified session. Public tracking links do not grant cancellation or owner rights.

Email signup verifies the address before private access. Phone signup verifies
the number. Linking both methods requires proof of both identifiers; matching
typed values cannot merge accounts. Keep phone-only users passwordless unless
an approved, verified linking flow permits a change. Optional user TOTP must
finish before a protected session becomes usable.

The platform administrator uses the configured email, password and required
authenticator. Keep admin setup and recovery separate from normal signup and
recovery. Reset must not remove required TOTP. See
[authentication](../architecture/auth.md) for the implementation contract.

Better Auth runs on Convex; no separate hosted Better Auth account is required.
Production email verification, recovery and invitations require Resend with a
verified sender. Live phone OTP requires MSG91 account and DLT/template proof.
Disposable test accounts and development verification stay on the isolated local
backend. Passwords belong only in the restricted annex or password manager,
outside Git and the shared guide.

## Workspace roles and invitations

A verified person may belong to more than one organisation. Use the existing
organisation and membership records as the authority for workspace access.
Check current membership and the requested capability on the server for every
read, write, export and private-file request.

| Workspace role | Approved minimum boundary                                                                                          |
| -------------- | ------------------------------------------------------------------------------------------------------------------ |
| **Owner**      | Manages the workspace within approved capabilities; protect the last owner according to the agreed rule            |
| **Admin**      | Manages explicitly granted capabilities, including invites where permitted; this is not the platform administrator |
| **Member**     | Performs assigned duties; no self-promotion or implied right to grant access                                       |
| **Viewer**     | Reads only permitted records; cannot write, approve trades or change roles                                         |

Record the exact ALLOW/DENY matrix for invites, role changes, prices, inventory,
trade approval, quality, reports, exports and private files before enabling each
workflow. Role names alone do not approve actions. Organisation approval alone
does not grant an observer private-data access.

An owner or permitted admin invites a teammate by email and selects a workspace
role. The recipient verifies that email, signs in, reviews the named organisation
and role, then accepts the one-use, expiring invite. A phone-only person must add
and verify the invited email first. Reject wrong-email, expired, revoked or
reused invites. Never merge identities automatically.

Workspace switching must preserve data boundaries. Revocation and demotion apply
to the next server action even with an old browser tab open. Test concurrent
acceptance, cross-organisation access and last-owner protection. Every invite,
grant, role change and revocation writes an audit event. Local acceptance
requires real browser journeys for owner, admin, member and viewer.

## Material and payment boundaries

- The kabadiwala buys household material and pays the household directly.
  Luma records weights, prices and the receipt; it does not transfer those funds.
- Manufacturers can offer non-hazardous recyclable byproducts to currently
  approved buyers handling that material. Check approval, material eligibility
  and workspace permission; do not restore a fixed next-role-only chain.
- B2B payment-dependent actions require a verified gateway event. Cashfree
  Payment Gateway with Easy Split is selected; integration and activation are
  pending. Manual paid flags, uploaded references and simulated escrow
  cannot authorize dispatch, completion, settlement or a paid receipt.
- Custody, quality and compliance records are evidence. They do not create stock,
  process yield, legal clearance, payment or certificates by themselves.
- Saathi work and pay remain a separate service question. Completed-job amounts
  do not prove a Luma transfer. Confirm employer, payer and terms before enabling
  a payment workflow.

Cashfree setup must include an Easy Split approval request for recycling-material
marketplace trades, vendor KYC, and actual payout/refund evidence. Technical
selection is not provider eligibility or merchant approval; see
[the provider setup boundary](../operations/environments.md#release-and-cloud-reactivation).

S2P/P2P segmentation, household coordinator duties and detailed commercial
responsibilities remain open in the requirements record. See the
[gateway decision](../decisions/0019-gateway-only-business-payments.md).

## Saathi name

“Saathi” (साथी, “partner”) replaced “foot soldiers” on 29 September 2026.
It covers pickups and short site shifts. Each locale uses its own translation.

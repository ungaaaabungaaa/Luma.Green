# Household flow

> **Status:** agreed spec, 29 Sep 2026 — built after onboarding. Screens: the
> "Household" page of the
> [prototype](https://claude.ai/artifact/4hiq2r5tm5kWDBqTGEPD8C).

The highest-volume part of the platform: hundreds of households, most on a
phone, many using Luma.Green once a month. It has to be as seamless as
possible.

## The three steps

1. **Snap (optional).** Take one photo, or select materials manually. The AI returns the materials it sees and
   a kilogram range for each (see
   [architecture/ai-estimation.md](../architecture/ai-estimation.md)). The
   household can correct the kilograms. A price range is shown from the fallback
   table ([pricing.md](./pricing.md)).
2. **Book.** Choose _pickup from home_ or _I'll drop it off_. See verified
   kabadiwalas nearby, nearest first, with their hours and whether they pick up.
   For a pickup choose a time slot and confirm the address. Sharing a coarse
   location is optional. Enter a
   mobile number and **confirm it with an SMS code** (MSG91). Book.
3. **Track and get paid.** The booking opens its tracking page. A tracking link also arrives by SMS
   when the approved status template is configured. The page shows **when**
   the appointment is, **who** is coming (name, shop, verified badge, call
   button) and **how much** money and how many recycle points to expect. After
   the pickup it shows what was actually paid and the points earned.

No account and no password. The booking lives in the browser and on the server
under the confirmed phone number, so the tracking link works on any device.

## Rules

- **Dispatch.** The booking is offered to the chosen kabadiwala. A kabadiwala
  with auto-accept on accepts instantly only when the household shares a
  location within that shop's service radius. Otherwise, after **15 minutes**
  or a rejection, dispatch looks for an eligible active pickup shop in the same
  city. It preserves or increases the quote and never repeats an attempted
  shop. Without a shared pin, the chosen shop is an approximate search origin;
  auto-accept stays off. The tracking page shows reassignments. Existing bookings
  without dispatch metadata and drop-offs retain manual acceptance.
- **Kabadiwalas without a vehicle** stay visible for drop-offs. Home pickups for
  them through Saathis come after the pilot.
- **Payment happens at the door**, in cash or UPI, between the household and the
  kabadiwala. Luma.Green records the amount and method; it does not move money
  in the pilot ([ADR 0009](../decisions/0009-money-off-platform-first.md)).
- **Drop-offs** get a short code to show at the shop, so the kabadiwala can
  record the visit and we can count the business we generated.
- **Recycle points** accrue at one point per ₹10 recorded as paid, to the
  confirmed phone number. What points are worth is **open**.
- **Cancelling** is free until the kabadiwala is on the way.

## Screens and URLs

| Screen                             | URL                                              | Indexed   |
| ---------------------------------- | ------------------------------------------------ | --------- |
| Basket and optional photo estimate | `/sell`                                          | Yes       |
| Shop, time and confirmation        | `/sell?step=shop`, `?step=when`, `?step=confirm` | Same page |
| Track                              | `/t/{code}`                                      | No        |

Full routing and canonical rules: [architecture/urls.md](../architecture/urls.md).

## What we keep, and for how long

| Data                          | Why                                       | Kept                                                                            |
| ----------------------------- | ----------------------------------------- | ------------------------------------------------------------------------------- |
| Phone number                  | Confirm the booking, send updates         | While the household has bookings in the last 12 months                          |
| Pickup address and pin        | So the kabadiwala can find them           | 12 months after the booking                                                     |
| Photos                        | Optional AI estimate                      | Transient only; Luma.Green does not store the image                             |
| Reviewed basket vs weighed kg | Compare submitted estimates with receipts | Saved through the normal booking; this does not measure original model accuracy |

Only the assigned kabadiwala sees the phone number and address, and only after
accepting.

## Later

- **WhatsApp.** The same three steps over a WhatsApp number: send photos, get a
  price, nearby shops and a booking. To be planned separately.
- **Live translation of AI output** — on hold; the interface itself is already
  hand-translated.

## Open

1. What recycle points are worth and what they redeem for.
2. Whether a separate consented study should retain photos and original model output for accuracy evaluation. The current photo flow stores neither.
3. The dispatch timeout (15 minutes is a guess — measure it in the pilot).

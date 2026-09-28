# Kabadiwala → yard hand-off

> **Status:** open — the founder is researching this, 29 Sep 2026. Nothing here
> is decided.

## What we know

- After pickups, the kabadiwala sorts the scrap at the shop.
- The kabadiwala needs a way to say what they hold: "I have this many tonnes of
  newspaper, this much of …".
- A preprocessor (yard) sees that stock and either **books a slot** to collect
  or **tells the kabadiwala they're coming**.
- The founder called this "the most important part".

The prototype's _My stock_ screen shows one possible shape: stock per material,
a switch to show it to yards, today's yard prices, and a yard's collection
request with Accept / Reject.

## Questions to answer before building

1. Who initiates — the kabadiwala posting stock, the yard posting demand, or
   both?
2. How are prices agreed — the yard's posted rate, a counter-offer, or a
   phone call?
3. Minimum quantities a yard will collect, per material.
4. Who transports — the yard's vehicle, the kabadiwala, or a Saathi — and who
   pays for it?
5. How is weight confirmed at hand-over — the yard's weighbridge, the
   kabadiwala's scale, both?
6. How and when is the kabadiwala paid — on the spot, later, through escrow?
7. Can a kabadiwala sell to several yards, or is there usually one regular?
8. What does a yard want to know about the material's origin?
9. What paperwork changes hands (delivery challan, e-way bill for larger loads)?

The answers fill in the "What all he wants" box between kabadiwala and yard in
[roles.md](./roles.md).

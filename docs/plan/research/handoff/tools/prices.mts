// Scratch: compute the seeded demo figures the test plan quotes.
import {
  CATALOGUE,
  catalogueEntry,
} from "/Users/syedabdulmuqeeth/Developer/Luma.Green/.claude/worktrees/wf_21434ea1-012-8/convex/lib/catalogue";
import {
  kgToGrams,
  paiseFor,
  pointsFor,
  requiresEwayBill,
} from "/Users/syedabdulmuqeeth/Developer/Luma.Green/.claude/worktrees/wf_21434ea1-012-8/convex/lib/chain";
import {
  DEMO_BOOKINGS,
  DEMO_JOBS,
  DEMO_LISTINGS,
  DEMO_ORGS,
  DEMO_TRADES,
} from "/Users/syedabdulmuqeeth/Developer/Luma.Green/.claude/worktrees/wf_21434ea1-012-8/convex/lib/demo";

const rs = (p: number) => `₹${(p / 100).toFixed(2)}`;
const entry = (code: string) => {
  const e = catalogueEntry(code);
  if (!e) throw new Error(code);
  return e;
};
const priceAt = (code: string, f: number) =>
  Math.round((entry(code).fallbackPaise * f) / 50) * 50;

console.log("== catalogue (code | en | floor | fallback | stage | co2e)");
for (const e of CATALOGUE)
  console.log(
    e.code,
    "|",
    e.names.en,
    "|",
    rs(e.floorPaise),
    "|",
    rs(e.fallbackPaise),
    "|",
    e.stage,
    "|",
    e.co2eFactor,
  );

const ramesh = DEMO_ORGS.find((o) => o.slug === "ramesh-kabadi-store");
if (!ramesh) throw new Error("no ramesh");
const rate = (code: string) =>
  Math.max(entry(code).floorPaise, priceAt(code, ramesh.priceFactor ?? 1));
console.log("== Ramesh rate card");
for (const e of CATALOGUE.filter(
  (c) => c.stage === "scrap" && ramesh.families.includes(c.family),
))
  console.log(e.names.en, rs(rate(e.code)), "min", rs(e.floorPaise));

console.log("== bookings");
DEMO_BOOKINGS.forEach((b, i) => {
  const est = b.items.reduce(
    (s, it) => s + paiseFor(kgToGrams(it.kg), rate(it.materialCode)),
    0,
  );
  let rec = "";
  if (b.status === "completed") {
    const lines = b.items.map((it) => {
      const g = Math.round(kgToGrams(it.kg) * 0.97);
      return { g, p: paiseFor(g, rate(it.materialCode)) };
    });
    const tot = lines.reduce((s, l) => s + l.p, 0);
    rec = ` receipt ${lines.map((l) => `${l.g}g=${rs(l.p)}`).join(" + ")} = ${rs(tot)} ${i % 2 === 0 ? "upi" : "cash"} points ${pointsFor(tot)}`;
  }
  console.log(
    i,
    b.name,
    b.status,
    "day",
    b.day,
    b.window,
    b.items
      .map((it) => `${it.kg}kg ${entry(it.materialCode).names.en}`)
      .join(" + "),
    "est",
    rs(est),
    rec,
  );
});

console.log("== listings");
for (const l of DEMO_LISTINGS)
  console.log(
    l.seller,
    "|",
    entry(l.materialCode).names.en,
    l.kg,
    "kg @",
    rs(priceAt(l.materialCode, l.factor)),
    "| total",
    rs(paiseFor(kgToGrams(l.kg), priceAt(l.materialCode, l.factor))),
    l.note ?? "",
  );

console.log("== trades");
DEMO_TRADES.forEach((t, i) => {
  const p = priceAt(t.materialCode, t.factor);
  const tot = paiseFor(kgToGrams(t.kg), p);
  console.log(
    i,
    t.seller,
    "->",
    t.buyer,
    entry(t.materialCode).names.en,
    t.kg,
    "kg @",
    rs(p),
    "=",
    rs(tot),
    t.status,
    `${t.daysAgo}d ago`,
    "eway",
    requiresEwayBill(tot),
    t.status === "requested" || t.status === "accepted"
      ? ""
      : `LG-26-${String(i + 1).padStart(4, "0")}`,
  );
});

console.log("== jobs");
for (const j of DEMO_JOBS)
  console.log(j.title, "|", j.area, "| day", j.day, j.window, "| ₹", j.payRupees, "|", j.status, "|", j.poster);

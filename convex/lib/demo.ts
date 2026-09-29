/**
 * The demo world for the prototype — every login, business, pickup, trade
 * and job the seed creates. Edit here, then `npx convex run demo:reset`.
 *
 * Demo logins work only where AUTH_DEV_MODE=true (the dev deployment), and
 * only for the numbers below: sign in with any of them and the code
 * DEMO_CODE. No SMS is ever sent to them.
 */

import type { Family } from "./catalogue";
import type { OrgKind } from "./chain";

export const DEMO_CITY = "Bengaluru";
export const DEMO_CODE = "123456";

export type DemoRole =
  | "kabadiwala"
  | "yard"
  | "recycler"
  | "manufacturer"
  | "saathi"
  | "new"
  | "applicant-yard"
  | "applicant-kabadiwala"
  | "household";

export interface DemoAccount {
  phone: string; // E.164
  role: DemoRole;
  name: string;
  /** What to try with this login — shown in the docs and on /demo. */
  tryThis: string;
}

export const DEMO_ACCOUNTS: readonly DemoAccount[] = [
  {
    phone: "+919000000101",
    role: "kabadiwala",
    name: "Ramesh Kumar",
    tryThis:
      "Accept a pickup request, weigh and pay, update prices, sell stock to a yard.",
  },
  {
    phone: "+919000000102",
    role: "yard",
    name: "Farida Begum",
    tryThis: "Buy from kabadiwalas, pay into escrow, sell bales to recyclers.",
  },
  {
    phone: "+919000000103",
    role: "recycler",
    name: "Suresh Reddy",
    tryThis: "Dispatch a paid order, buy PET from yards, check EPR records.",
  },
  {
    phone: "+919000000104",
    role: "manufacturer",
    name: "Anita Rao",
    tryThis:
      "Order recycled PET flakes, confirm a delivery, see recycled content.",
  },
  {
    phone: "+919000000105",
    role: "saathi",
    name: "Lakshmi Devi",
    tryThis: "Take a job near you, mark it done, see earnings.",
  },
  {
    phone: "+919000000106",
    role: "new",
    name: "New applicant",
    tryThis: "Sign up as any role from scratch.",
  },
  {
    phone: "+919000000107",
    role: "applicant-yard",
    name: "Mohammed Irfan",
    tryThis: "A yard application waiting for the admin.",
  },
  {
    phone: "+919000000108",
    role: "applicant-kabadiwala",
    name: "Kavitha S",
    tryThis: "A kabadiwala application waiting for the admin.",
  },
  {
    phone: "+919000000109",
    role: "household",
    name: "Priya Sharma",
    tryThis: "Book a pickup at /sell and follow it on the tracking page.",
  },
];

/** A demo login, but only where demo mode is on. */
export function isDemoPhone(
  phone: string,
  devMode: string | undefined,
): boolean {
  return (
    devMode === "true" &&
    DEMO_ACCOUNTS.some((account) => account.phone === phone)
  );
}

export interface DemoOrg {
  slug: string;
  kind: OrgKind;
  name: string;
  /** The demo login that runs it; none = a business on the map only. */
  ownerRole?: DemoRole;
  area: string;
  address: string;
  location: { lat: number; lng: number };
  families: Family[];
  offersPickup: boolean;
  vehicle?: "handcart" | "cycle" | "auto" | "mini_truck";
  gstin?: string;
  consent?: { board: string; number: string; validUntil: string };
  /** Stock on hand, kg per material code. */
  stock: Record<string, number>;
  /** Household prices as a multiple of the city fallback (kabadiwalas). */
  priceFactor?: number;
}

export const DEMO_ORGS: readonly DemoOrg[] = [
  {
    slug: "ramesh-kabadi-store",
    kind: "kabadiwala",
    name: "Ramesh Kabadi Store",
    ownerRole: "kabadiwala",
    area: "Yeshwanthpur",
    address: "12, 4th Cross, Yeshwanthpur, near the bus stand",
    location: { lat: 13.028, lng: 77.5409 },
    families: ["paper", "plastic", "metal", "ewaste"],
    offersPickup: true,
    vehicle: "auto",
    stock: {
      "PAPER-NEWS": 180,
      "PAPER-CARTON": 300,
      "PLASTIC-PET": 42,
      "METAL-IRON": 260,
      "METAL-ALU-CAN": 12,
    },
    priceFactor: 1.05,
  },
  {
    slug: "sri-lakshmi-scrap",
    kind: "kabadiwala",
    name: "Sri Lakshmi Scrap",
    area: "Malleshwaram",
    address: "8th Main, Malleshwaram",
    location: { lat: 13.0035, lng: 77.571 },
    families: ["paper", "plastic", "metal"],
    offersPickup: true,
    vehicle: "cycle",
    stock: { "PAPER-NEWS": 120, "PLASTIC-PET": 100, "METAL-IRON": 140 },
    priceFactor: 1,
  },
  {
    slug: "jayanagar-raddi-centre",
    kind: "kabadiwala",
    name: "Jayanagar Raddi Centre",
    area: "Jayanagar",
    address: "11th Main, 4th Block, Jayanagar",
    location: { lat: 12.925, lng: 77.5938 },
    families: ["paper", "plastic"],
    offersPickup: false,
    stock: { "PAPER-NEWS": 300, "PAPER-BOOKS": 90 },
    priceFactor: 0.98,
  },
  {
    slug: "indiranagar-kabadi-point",
    kind: "kabadiwala",
    name: "Indiranagar Kabadi Point",
    area: "Indiranagar",
    address: "HAL 2nd Stage, Indiranagar",
    location: { lat: 12.9784, lng: 77.6408 },
    families: ["paper", "plastic", "metal", "ewaste"],
    offersPickup: true,
    vehicle: "auto",
    stock: { "PLASTIC-PET": 80, "EWASTE-SMALL": 35 },
    priceFactor: 1.08,
  },
  {
    slug: "koramangala-scrap-traders",
    kind: "kabadiwala",
    name: "Koramangala Scrap Traders",
    area: "Koramangala",
    address: "5th Block, Koramangala",
    location: { lat: 12.9352, lng: 77.6245 },
    families: ["paper", "metal", "glass"],
    offersPickup: true,
    vehicle: "handcart",
    stock: { "METAL-IRON": 410, "GLASS-BOTTLE": 150 },
    priceFactor: 1.02,
  },
  {
    slug: "hsr-waste-buyers",
    kind: "kabadiwala",
    name: "HSR Waste Buyers",
    area: "HSR Layout",
    address: "Sector 2, HSR Layout",
    location: { lat: 12.9116, lng: 77.6474 },
    families: ["paper", "plastic", "metal", "ewaste"],
    offersPickup: true,
    vehicle: "mini_truck",
    stock: { "PAPER-CARTON": 210, "PLASTIC-HDPE": 60 },
    priceFactor: 1.03,
  },
  {
    slug: "peenya-paper-plastic-yard",
    kind: "yard",
    name: "Peenya Paper & Plastic Yard",
    ownerRole: "yard",
    area: "Peenya Industrial Area",
    address: "Plot 7, 3rd Phase, Peenya Industrial Area",
    location: { lat: 13.0285, lng: 77.519 },
    families: ["paper", "plastic"],
    offersPickup: true,
    vehicle: "mini_truck",
    gstin: "29ABCPE1234F1Z5",
    consent: {
      board: "KSPCB",
      number: "KSPCB/CFO/2025/1187",
      validUntil: "2027-06-30",
    },
    stock: {
      "PAPER-NEWS": 4200,
      "PAPER-CARTON": 6800,
      "PLASTIC-PET": 1500,
      "PLASTIC-HDPE": 900,
    },
  },
  {
    slug: "hebbal-metal-yard",
    kind: "yard",
    name: "Hebbal Metal Yard",
    area: "Hebbal",
    address: "Outer Ring Road, Hebbal",
    location: { lat: 13.0358, lng: 77.597 },
    families: ["metal"],
    offersPickup: true,
    vehicle: "mini_truck",
    gstin: "29AAHMY5678K1Z2",
    consent: {
      board: "KSPCB",
      number: "KSPCB/CFO/2024/0932",
      validUntil: "2026-12-31",
    },
    stock: { "METAL-IRON": 5200, "METAL-ALU": 640 },
  },
  {
    slug: "greenloop-polymers",
    kind: "recycler",
    name: "GreenLoop Polymers",
    ownerRole: "recycler",
    area: "Bommasandra",
    address: "KIADB Industrial Area, Bommasandra",
    location: { lat: 12.8155, lng: 77.697 },
    families: ["plastic"],
    offersPickup: false,
    gstin: "29AAGCG4321L1Z8",
    consent: {
      board: "KSPCB",
      number: "KSPCB/CFO/2025/2210",
      validUntil: "2028-03-31",
    },
    stock: {
      "PLASTIC-PET": 12_000,
      "PLASTIC-HDPE": 5500,
      "RECYCLED-PET-FLAKE": 15_000,
      "RECYCLED-HDPE-GRANULE": 4000,
    },
  },
  {
    slug: "bidadi-recycling-works",
    kind: "recycler",
    name: "Bidadi Recycling Works",
    area: "Bidadi",
    address: "Bidadi Industrial Area",
    location: { lat: 12.797, lng: 77.388 },
    families: ["paper", "metal"],
    offersPickup: false,
    gstin: "29AABCB7788M1Z3",
    consent: {
      board: "KSPCB",
      number: "KSPCB/CFO/2023/1456",
      validUntil: "2027-01-31",
    },
    stock: { "RECYCLED-KRAFT": 15_000, "RECYCLED-ALU-INGOT": 2200 },
  },
  {
    slug: "deccan-packaging",
    kind: "manufacturer",
    name: "Deccan Packaging Pvt Ltd",
    ownerRole: "manufacturer",
    area: "Nelamangala",
    address: "Industrial Estate, Nelamangala",
    location: { lat: 13.099, lng: 77.393 },
    families: ["paper", "plastic"],
    offersPickup: false,
    gstin: "29AADCD9900P1Z6",
    consent: {
      board: "KSPCB",
      number: "KSPCB/CFO/2024/3301",
      validUntil: "2029-03-31",
    },
    stock: { "RECYCLED-KRAFT": 8000, "RECYCLED-PET-FLAKE": 3000 },
  },
  {
    slug: "kumbalgodu-paper-mills",
    kind: "manufacturer",
    name: "Kumbalgodu Paper Mills",
    area: "Kumbalgodu",
    address: "Mysuru Road, Kumbalgodu",
    location: { lat: 12.872, lng: 77.441 },
    families: ["paper"],
    offersPickup: false,
    gstin: "29AAECK1122Q1Z9",
    consent: {
      board: "KSPCB",
      number: "KSPCB/CFO/2022/0877",
      validUntil: "2027-09-30",
    },
    stock: {},
  },
];

/** Open lots on the market: seller slug, material, kg, price vs city fallback. */
export const DEMO_LISTINGS: readonly {
  seller: string;
  materialCode: string;
  kg: number;
  factor: number;
  note?: string;
}[] = [
  {
    seller: "ramesh-kabadi-store",
    materialCode: "PAPER-NEWS",
    kg: 150,
    factor: 1.25,
    note: "Dry, bundled",
  },
  {
    seller: "ramesh-kabadi-store",
    materialCode: "METAL-IRON",
    kg: 250,
    factor: 1.2,
  },
  {
    seller: "sri-lakshmi-scrap",
    materialCode: "PAPER-NEWS",
    kg: 110,
    factor: 1.22,
  },
  {
    seller: "koramangala-scrap-traders",
    materialCode: "METAL-IRON",
    kg: 400,
    factor: 1.18,
  },
  {
    seller: "hsr-waste-buyers",
    materialCode: "PAPER-CARTON",
    kg: 200,
    factor: 1.3,
    note: "Flattened boxes",
  },
  {
    seller: "indiranagar-kabadi-point",
    materialCode: "PLASTIC-PET",
    kg: 75,
    factor: 1.3,
  },
  {
    seller: "peenya-paper-plastic-yard",
    materialCode: "PAPER-CARTON",
    kg: 5000,
    factor: 1.8,
    note: "Baled OCC, 500 kg bales",
  },
  {
    seller: "peenya-paper-plastic-yard",
    materialCode: "PLASTIC-PET",
    kg: 1200,
    factor: 1.9,
    note: "Sorted clear PET, baled",
  },
  {
    seller: "hebbal-metal-yard",
    materialCode: "METAL-IRON",
    kg: 3000,
    factor: 1.5,
  },
  {
    seller: "greenloop-polymers",
    materialCode: "RECYCLED-PET-FLAKE",
    kg: 8000,
    factor: 1,
    note: "Hot-washed flakes, food-grade trial lot",
  },
  {
    seller: "greenloop-polymers",
    materialCode: "RECYCLED-HDPE-GRANULE",
    kg: 3500,
    factor: 1,
  },
  {
    seller: "bidadi-recycling-works",
    materialCode: "RECYCLED-KRAFT",
    kg: 12_000,
    factor: 1,
    note: "120 GSM kraft rolls",
  },
  {
    seller: "bidadi-recycling-works",
    materialCode: "RECYCLED-ALU-INGOT",
    kg: 2000,
    factor: 1,
  },
];

/** Trades already under way: [seller, buyer, material, kg, factor, status]. */
export const DEMO_TRADES: readonly {
  seller: string;
  buyer: string;
  materialCode: string;
  kg: number;
  factor: number;
  status:
    "requested" | "accepted" | "paid_to_escrow" | "dispatched" | "completed";
  daysAgo: number;
}[] = [
  {
    seller: "ramesh-kabadi-store",
    buyer: "peenya-paper-plastic-yard",
    materialCode: "PAPER-NEWS",
    kg: 400,
    factor: 1.25,
    status: "completed",
    daysAgo: 6,
  },
  {
    seller: "ramesh-kabadi-store",
    buyer: "peenya-paper-plastic-yard",
    materialCode: "PAPER-CARTON",
    kg: 180,
    factor: 1.3,
    status: "paid_to_escrow",
    daysAgo: 1,
  },
  {
    seller: "sri-lakshmi-scrap",
    buyer: "peenya-paper-plastic-yard",
    materialCode: "PLASTIC-PET",
    kg: 90,
    factor: 1.3,
    status: "requested",
    daysAgo: 0,
  },
  {
    seller: "peenya-paper-plastic-yard",
    buyer: "greenloop-polymers",
    materialCode: "PLASTIC-PET",
    kg: 2000,
    factor: 1.9,
    status: "dispatched",
    daysAgo: 2,
  },
  {
    seller: "peenya-paper-plastic-yard",
    buyer: "greenloop-polymers",
    materialCode: "PLASTIC-HDPE",
    kg: 800,
    factor: 1.9,
    status: "completed",
    daysAgo: 12,
  },
  {
    seller: "greenloop-polymers",
    buyer: "deccan-packaging",
    materialCode: "RECYCLED-PET-FLAKE",
    kg: 5000,
    factor: 1,
    status: "paid_to_escrow",
    daysAgo: 1,
  },
  {
    seller: "greenloop-polymers",
    buyer: "deccan-packaging",
    materialCode: "RECYCLED-HDPE-GRANULE",
    kg: 2500,
    factor: 1,
    status: "completed",
    daysAgo: 20,
  },
  {
    seller: "bidadi-recycling-works",
    buyer: "deccan-packaging",
    materialCode: "RECYCLED-KRAFT",
    kg: 10_000,
    factor: 1,
    status: "requested",
    daysAgo: 0,
  },
];

/** Household pickups at the demo kabadiwala: [phone, items, status, days ahead/ago]. */
export const DEMO_BOOKINGS: readonly {
  phone: string;
  name: string;
  items: { materialCode: string; kg: number }[];
  status: "requested" | "accepted" | "on_the_way" | "completed";
  day: number; // 0 = today, -2 = two days ago
  window: "morning" | "afternoon" | "evening";
  address: string;
}[] = [
  {
    phone: "+919000000109",
    name: "Priya Sharma",
    items: [
      { materialCode: "PAPER-NEWS", kg: 12 },
      { materialCode: "PLASTIC-PET", kg: 3 },
    ],
    status: "requested",
    day: 0,
    window: "evening",
    address: "Flat 4B, Rose Apartments, Yeshwanthpur",
  },
  {
    phone: "+919845000011",
    name: "Arjun Nair",
    items: [
      { materialCode: "PAPER-CARTON", kg: 8 },
      { materialCode: "METAL-IRON", kg: 15 },
    ],
    status: "requested",
    day: 1,
    window: "morning",
    address: "22, 2nd Cross, Mathikere",
  },
  {
    phone: "+919845000012",
    name: "Meena Iyer",
    items: [{ materialCode: "PAPER-NEWS", kg: 20 }],
    status: "accepted",
    day: 0,
    window: "afternoon",
    address: "5, Sampige Road, Malleshwaram",
  },
  {
    phone: "+919845000013",
    name: "Rahul Gowda",
    items: [
      { materialCode: "EWASTE-SMALL", kg: 4 },
      { materialCode: "METAL-ALU-CAN", kg: 2 },
    ],
    status: "on_the_way",
    day: 0,
    window: "morning",
    address: "HMT Layout, Yeshwanthpur",
  },
  {
    phone: "+919000000109",
    name: "Priya Sharma",
    items: [
      { materialCode: "PAPER-NEWS", kg: 18 },
      { materialCode: "PAPER-CARTON", kg: 6 },
    ],
    status: "completed",
    day: -9,
    window: "morning",
    address: "Flat 4B, Rose Apartments, Yeshwanthpur",
  },
  {
    phone: "+919845000014",
    name: "Fatima Khan",
    items: [
      { materialCode: "METAL-IRON", kg: 30 },
      { materialCode: "PLASTIC-HDPE", kg: 5 },
    ],
    status: "completed",
    day: -3,
    window: "afternoon",
    address: "Tumkur Road, Goraguntepalya",
  },
  {
    phone: "+919845000015",
    name: "Vikram Shetty",
    items: [{ materialCode: "PAPER-BOOKS", kg: 25 }],
    status: "completed",
    day: -1,
    window: "evening",
    address: "Nandini Layout",
  },
];

/** Paid work for Saathis: [kind, title, area, day, window, pay ₹, poster slug, status]. */
export const DEMO_JOBS: readonly {
  kind: "home_pickups" | "shop_help" | "yard_sorting" | "factory_shifts";
  title: string;
  area: string;
  day: number;
  window: "morning" | "afternoon" | "evening";
  payRupees: number;
  poster?: string;
  status: "open" | "assigned" | "done";
}[] = [
  {
    kind: "home_pickups",
    title: "Home pickups, 6 houses",
    area: "Yeshwanthpur",
    day: 0,
    window: "evening",
    payRupees: 450,
    poster: "ramesh-kabadi-store",
    status: "open",
  },
  {
    kind: "yard_sorting",
    title: "Sorting shift: paper and PET",
    area: "Peenya",
    day: 1,
    window: "morning",
    payRupees: 700,
    poster: "peenya-paper-plastic-yard",
    status: "open",
  },
  {
    kind: "shop_help",
    title: "Help at the shop, loading",
    area: "Malleshwaram",
    day: 1,
    window: "afternoon",
    payRupees: 400,
    poster: "sri-lakshmi-scrap",
    status: "open",
  },
  {
    kind: "factory_shifts",
    title: "Line helper, flake packing",
    area: "Bommasandra",
    day: 2,
    window: "morning",
    payRupees: 800,
    poster: "greenloop-polymers",
    status: "open",
  },
  {
    kind: "home_pickups",
    title: "Home pickups, 4 houses",
    area: "Mathikere",
    day: 0,
    window: "morning",
    payRupees: 350,
    poster: "ramesh-kabadi-store",
    status: "assigned",
  },
  {
    kind: "yard_sorting",
    title: "Sorting shift: cartons",
    area: "Peenya",
    day: -2,
    window: "morning",
    payRupees: 700,
    poster: "peenya-paper-plastic-yard",
    status: "done",
  },
  {
    kind: "home_pickups",
    title: "Home pickups, 5 houses",
    area: "Yeshwanthpur",
    day: -4,
    window: "evening",
    payRupees: 400,
    poster: "ramesh-kabadi-store",
    status: "done",
  },
];

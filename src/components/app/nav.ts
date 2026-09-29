import {
  ArrowLeftRightIcon,
  BellIcon,
  BoxesIcon,
  BriefcaseBusinessIcon,
  BuildingIcon,
  ClipboardListIcon,
  CoinsIcon,
  DoorOpenIcon,
  FactoryIcon,
  FileDownIcon,
  GraduationCapIcon,
  HandshakeIcon,
  HouseIcon,
  IndianRupeeIcon,
  LeafIcon,
  ListChecksIcon,
  LockIcon,
  type LucideIcon,
  MapIcon,
  MegaphoneIcon,
  NotebookPenIcon,
  PackageIcon,
  PackageSearchIcon,
  ScaleIcon,
  ShieldCheckIcon,
  ShoppingCartIcon,
  SunIcon,
  TagIcon,
  TruckIcon,
  UsersIcon,
  ZapIcon,
} from "lucide-react";

/** Every screen in the business app, by who uses it. */

export type AppRole =
  "kabadiwala" | "yard" | "recycler" | "manufacturer" | "saathi";

export interface NavItem {
  href: string;
  /** Key under `app.nav` in messages. */
  label: string;
  icon: LucideIcon;
}

const item = (href: string, label: string, icon: LucideIcon): NavItem => ({
  href,
  label,
  icon,
});

const home = item("/app", "home", HouseIcon);
const stock = item("/app/stock", "stock", PackageIcon);
const buy = item("/app/market", "buy", ShoppingCartIcon);
const sell = item("/app/sell", "sell", TagIcon);
const trades = item("/app/trades", "trades", ArrowLeftRightIcon);
const impact = item("/app/impact", "impact", LeafIcon);
const compliance = item("/app/compliance", "compliance", ShieldCheckIcon);
const lots = item("/app/lots", "lots", PackageSearchIcon);
const scales = item("/app/scales", "scales", ScaleIcon);
const gate = item("/app/gate", "gate", DoorOpenIcon);
const production = item("/app/production", "production", FactoryIcon);
const team = item("/app/team", "team", UsersIcon);
const route = item("/app/route", "route", MapIcon);
const loads = item("/app/loads", "loads", TruckIcon);
const khata = item("/app/khata", "khata", NotebookPenIcon);
const exports = item("/app/exports", "exports", FileDownIcon);
const centre = item("/app/centre", "centre", BuildingIcon);
const workRecord = item("/app/work-record", "workRecord", ListChecksIcon);
const contracts = item("/app/contracts", "contracts", HandshakeIcon);
const disputes = item("/app/disputes", "disputes", MegaphoneIcon);
const privacy = item("/app/privacy", "privacy", LockIcon);
const registrations = item(
  "/app/registrations",
  "registrations",
  ShieldCheckIcon,
);
const credits = item("/app/credits", "credits", CoinsIcon);
const energy = item("/app/energy", "energy", ZapIcon);
const solar = item("/app/solar", "solar", SunIcon);
const training = item("/app/training", "training", GraduationCapIcon);
const policies = item("/app/policies", "policies", BoxesIcon);
const demand = item("/app/demand", "demand", MegaphoneIcon);
const notifications = item("/app/notifications", "notifications", BellIcon);

/** `primary` sits in the phone's bottom bar (≤ 5); `more` in the menu. */
export const NAV: Record<AppRole, { primary: NavItem[]; more: NavItem[] }> = {
  kabadiwala: {
    primary: [
      home,
      item("/app/requests", "requests", ClipboardListIcon),
      stock,
      item("/app/prices", "prices", IndianRupeeIcon),
      sell,
    ],
    more: [
      trades,
      route,
      policies,
      lots,
      scales,
      khata,
      contracts,
      exports,
      impact,
      credits,
      compliance,
      registrations,
      disputes,
      notifications,
      solar,
      privacy,
    ],
  },
  yard: {
    primary: [home, buy, stock, sell, trades],
    more: [
      demand,
      lots,
      gate,
      scales,
      production,
      loads,
      khata,
      team,
      centre,
      contracts,
      exports,
      impact,
      credits,
      energy,
      compliance,
      registrations,
      disputes,
      notifications,
      solar,
      privacy,
    ],
  },
  recycler: {
    primary: [home, buy, stock, sell, trades],
    more: [
      demand,
      lots,
      gate,
      scales,
      production,
      loads,
      khata,
      team,
      exports,
      impact,
      credits,
      energy,
      compliance,
      registrations,
      disputes,
      notifications,
      solar,
      privacy,
    ],
  },
  manufacturer: {
    primary: [home, buy, trades, compliance, impact],
    more: [
      stock,
      demand,
      lots,
      gate,
      scales,
      production,
      loads,
      khata,
      team,
      exports,
      credits,
      energy,
      registrations,
      disputes,
      notifications,
      solar,
      privacy,
    ],
  },
  saathi: {
    primary: [
      home,
      item("/app/impact", "earnings", BriefcaseBusinessIcon),
      workRecord,
      training,
    ],
    more: [notifications, disputes, privacy],
  },
};

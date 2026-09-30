/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as admin from "../admin.js";
import type * as adminPrices from "../adminPrices.js";
import type * as applicationFiles from "../applicationFiles.js";
import type * as applications from "../applications.js";
import type * as auth from "../auth.js";
import type * as catalogue from "../catalogue.js";
import type * as crons from "../crons.js";
import type * as demo from "../demo.js";
import type * as demo_adminExtras from "../demo/adminExtras.js";
import type * as demo_city from "../demo/city.js";
import type * as demo_credits from "../demo/credits.js";
import type * as demo_exports from "../demo/exports.js";
import type * as demo_floor from "../demo/floor.js";
import type * as demo_grievance from "../demo/grievance.js";
import type * as demo_hazard from "../demo/hazard.js";
import type * as demo_institutions from "../demo/institutions.js";
import type * as demo_kabadi from "../demo/kabadi.js";
import type * as demo_logistics from "../demo/logistics.js";
import type * as demo_lots from "../demo/lots.js";
import type * as demo_marketExtras from "../demo/marketExtras.js";
import type * as demo_notifications from "../demo/notifications.js";
import type * as demo_onboarding from "../demo/onboarding.js";
import type * as demo_payments from "../demo/payments.js";
import type * as demo_priceEngine from "../demo/priceEngine.js";
import type * as demo_rulebook from "../demo/rulebook.js";
import type * as demo_solar from "../demo/solar.js";
import type * as demo_support from "../demo/support.js";
import type * as demo_world from "../demo/world.js";
import type * as exports from "../exports.js";
import type * as files from "../files.js";
import type * as floor from "../floor.js";
import type * as households from "../households.js";
import type * as http from "../http.js";
import type * as identity from "../identity.js";
import type * as insights from "../insights.js";
import type * as lib_access from "../lib/access.js";
import type * as lib_admin from "../lib/admin.js";
import type * as lib_applicationAccess from "../lib/applicationAccess.js";
import type * as lib_catalogue from "../lib/catalogue.js";
import type * as lib_chain from "../lib/chain.js";
import type * as lib_dates from "../lib/dates.js";
import type * as lib_demo from "../lib/demo.js";
import type * as lib_demoFiles from "../lib/demoFiles.js";
import type * as lib_demoWorld from "../lib/demoWorld.js";
import type * as lib_drafts from "../lib/drafts.js";
import type * as lib_households from "../lib/households.js";
import type * as lib_lifecycle from "../lib/lifecycle.js";
import type * as lib_onboarding from "../lib/onboarding.js";
import type * as lib_phone from "../lib/phone.js";
import type * as lib_quality from "../lib/quality.js";
import type * as lib_review from "../lib/review.js";
import type * as lib_routing from "../lib/routing.js";
import type * as lib_rules from "../lib/rules.js";
import type * as lib_sms from "../lib/sms.js";
import type * as lib_tax from "../lib/tax.js";
import type * as lib_validators from "../lib/validators.js";
import type * as lib_views from "../lib/views.js";
import type * as lib_workspace from "../lib/workspace.js";
import type * as logistics from "../logistics.js";
import type * as lots from "../lots.js";
import type * as market from "../market.js";
import type * as notifications from "../notifications.js";
import type * as payments from "../payments.js";
import type * as priceEngine from "../priceEngine.js";
import type * as review from "../review.js";
import type * as rulebook from "../rulebook.js";
import type * as saathi from "../saathi.js";
import type * as shop from "../shop.js";
import type * as sms from "../sms.js";
import type * as stock from "../stock.js";
import type * as support from "../support.js";
import type * as tables_adminExtras from "../tables/adminExtras.js";
import type * as tables_city from "../tables/city.js";
import type * as tables_credits from "../tables/credits.js";
import type * as tables_exports from "../tables/exports.js";
import type * as tables_floor from "../tables/floor.js";
import type * as tables_grievance from "../tables/grievance.js";
import type * as tables_hazard from "../tables/hazard.js";
import type * as tables_index from "../tables/index.js";
import type * as tables_institutions from "../tables/institutions.js";
import type * as tables_kabadi from "../tables/kabadi.js";
import type * as tables_logistics from "../tables/logistics.js";
import type * as tables_lots from "../tables/lots.js";
import type * as tables_marketExtras from "../tables/marketExtras.js";
import type * as tables_notifications from "../tables/notifications.js";
import type * as tables_onboarding from "../tables/onboarding.js";
import type * as tables_payments from "../tables/payments.js";
import type * as tables_priceEngine from "../tables/priceEngine.js";
import type * as tables_rulebook from "../tables/rulebook.js";
import type * as tables_solar from "../tables/solar.js";
import type * as tables_support from "../tables/support.js";
import type * as tables_world from "../tables/world.js";
import type * as workspace from "../workspace.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  admin: typeof admin;
  adminPrices: typeof adminPrices;
  applicationFiles: typeof applicationFiles;
  applications: typeof applications;
  auth: typeof auth;
  catalogue: typeof catalogue;
  crons: typeof crons;
  demo: typeof demo;
  "demo/adminExtras": typeof demo_adminExtras;
  "demo/city": typeof demo_city;
  "demo/credits": typeof demo_credits;
  "demo/exports": typeof demo_exports;
  "demo/floor": typeof demo_floor;
  "demo/grievance": typeof demo_grievance;
  "demo/hazard": typeof demo_hazard;
  "demo/institutions": typeof demo_institutions;
  "demo/kabadi": typeof demo_kabadi;
  "demo/logistics": typeof demo_logistics;
  "demo/lots": typeof demo_lots;
  "demo/marketExtras": typeof demo_marketExtras;
  "demo/notifications": typeof demo_notifications;
  "demo/onboarding": typeof demo_onboarding;
  "demo/payments": typeof demo_payments;
  "demo/priceEngine": typeof demo_priceEngine;
  "demo/rulebook": typeof demo_rulebook;
  "demo/solar": typeof demo_solar;
  "demo/support": typeof demo_support;
  "demo/world": typeof demo_world;
  exports: typeof exports;
  files: typeof files;
  floor: typeof floor;
  households: typeof households;
  http: typeof http;
  identity: typeof identity;
  insights: typeof insights;
  "lib/access": typeof lib_access;
  "lib/admin": typeof lib_admin;
  "lib/applicationAccess": typeof lib_applicationAccess;
  "lib/catalogue": typeof lib_catalogue;
  "lib/chain": typeof lib_chain;
  "lib/dates": typeof lib_dates;
  "lib/demo": typeof lib_demo;
  "lib/demoFiles": typeof lib_demoFiles;
  "lib/demoWorld": typeof lib_demoWorld;
  "lib/drafts": typeof lib_drafts;
  "lib/households": typeof lib_households;
  "lib/lifecycle": typeof lib_lifecycle;
  "lib/onboarding": typeof lib_onboarding;
  "lib/phone": typeof lib_phone;
  "lib/quality": typeof lib_quality;
  "lib/review": typeof lib_review;
  "lib/routing": typeof lib_routing;
  "lib/rules": typeof lib_rules;
  "lib/sms": typeof lib_sms;
  "lib/tax": typeof lib_tax;
  "lib/validators": typeof lib_validators;
  "lib/views": typeof lib_views;
  "lib/workspace": typeof lib_workspace;
  lots: typeof lots;
  market: typeof market;
  notifications: typeof notifications;
  payments: typeof payments;
  priceEngine: typeof priceEngine;
  review: typeof review;
  rulebook: typeof rulebook;
  saathi: typeof saathi;
  shop: typeof shop;
  sms: typeof sms;
  stock: typeof stock;
  support: typeof support;
  "logistics": typeof logistics;
  "tables/adminExtras": typeof tables_adminExtras;
  "tables/city": typeof tables_city;
  "tables/credits": typeof tables_credits;
  "tables/exports": typeof tables_exports;
  "tables/floor": typeof tables_floor;
  "tables/grievance": typeof tables_grievance;
  "tables/hazard": typeof tables_hazard;
  "tables/index": typeof tables_index;
  "tables/institutions": typeof tables_institutions;
  "tables/kabadi": typeof tables_kabadi;
  "tables/logistics": typeof tables_logistics;
  "tables/lots": typeof tables_lots;
  "tables/marketExtras": typeof tables_marketExtras;
  "tables/notifications": typeof tables_notifications;
  "tables/onboarding": typeof tables_onboarding;
  "tables/payments": typeof tables_payments;
  "tables/priceEngine": typeof tables_priceEngine;
  "tables/rulebook": typeof tables_rulebook;
  "tables/solar": typeof tables_solar;
  "tables/support": typeof tables_support;
  "tables/world": typeof tables_world;
  workspace: typeof workspace;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {
  betterAuth: import("../betterAuth/_generated/component.js").ComponentApi<"betterAuth">;
};

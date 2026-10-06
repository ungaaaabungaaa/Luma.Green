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
import type * as authEvents from "../authEvents.js";
import type * as catalogue from "../catalogue.js";
import type * as commercialEvidence from "../commercialEvidence.js";
import type * as crons from "../crons.js";
import type * as demand from "../demand.js";
import type * as demo from "../demo.js";
import type * as demoPrices from "../demoPrices.js";
import type * as demoWorkspace from "../demoWorkspace.js";
import type * as dispatch from "../dispatch.js";
import type * as files from "../files.js";
import type * as households from "../households.js";
import type * as http from "../http.js";
import type * as identity from "../identity.js";
import type * as inbox from "../inbox.js";
import type * as industryNews from "../industryNews.js";
import type * as insights from "../insights.js";
import type * as integrationHttp from "../integrationHttp.js";
import type * as integrations from "../integrations.js";
import type * as lib_access from "../lib/access.js";
import type * as lib_admin from "../lib/admin.js";
import type * as lib_adminRecovery from "../lib/adminRecovery.js";
import type * as lib_applicationAccess from "../lib/applicationAccess.js";
import type * as lib_catalogue from "../lib/catalogue.js";
import type * as lib_chain from "../lib/chain.js";
import type * as lib_commercialEvidence from "../lib/commercialEvidence.js";
import type * as lib_commercialPricing from "../lib/commercialPricing.js";
import type * as lib_dates from "../lib/dates.js";
import type * as lib_demo from "../lib/demo.js";
import type * as lib_demoFiles from "../lib/demoFiles.js";
import type * as lib_demoPrices from "../lib/demoPrices.js";
import type * as lib_dispatch from "../lib/dispatch.js";
import type * as lib_drafts from "../lib/drafts.js";
import type * as lib_ecosystem from "../lib/ecosystem.js";
import type * as lib_households from "../lib/households.js";
import type * as lib_industryNews from "../lib/industryNews.js";
import type * as lib_integrationHttp from "../lib/integrationHttp.js";
import type * as lib_integrationOpenapi from "../lib/integrationOpenapi.js";
import type * as lib_integrations from "../lib/integrations.js";
import type * as lib_inventory from "../lib/inventory.js";
import type * as lib_lifecycle from "../lib/lifecycle.js";
import type * as lib_messaging from "../lib/messaging.js";
import type * as lib_notificationConfig from "../lib/notificationConfig.js";
import type * as lib_notifications from "../lib/notifications.js";
import type * as lib_onboarding from "../lib/onboarding.js";
import type * as lib_phone from "../lib/phone.js";
import type * as lib_phoneTwoFactor from "../lib/phoneTwoFactor.js";
import type * as lib_photoEstimates from "../lib/photoEstimates.js";
import type * as lib_photoProvider from "../lib/photoProvider.js";
import type * as lib_pilot from "../lib/pilot.js";
import type * as lib_publicData from "../lib/publicData.js";
import type * as lib_push from "../lib/push.js";
import type * as lib_pushCopy from "../lib/pushCopy.js";
import type * as lib_review from "../lib/review.js";
import type * as lib_securityAudit from "../lib/securityAudit.js";
import type * as lib_sms from "../lib/sms.js";
import type * as lib_smsLimits from "../lib/smsLimits.js";
import type * as lib_validators from "../lib/validators.js";
import type * as lib_views from "../lib/views.js";
import type * as lib_workspace from "../lib/workspace.js";
import type * as market from "../market.js";
import type * as messaging from "../messaging.js";
import type * as notifications from "../notifications.js";
import type * as photoEstimates from "../photoEstimates.js";
import type * as pilot from "../pilot.js";
import type * as publicData from "../publicData.js";
import type * as push from "../push.js";
import type * as pushDelivery from "../pushDelivery.js";
import type * as pushState from "../pushState.js";
import type * as review from "../review.js";
import type * as saathi from "../saathi.js";
import type * as shop from "../shop.js";
import type * as sms from "../sms.js";
import type * as smsLimits from "../smsLimits.js";
import type * as stock from "../stock.js";
import type * as support from "../support.js";
import type * as workforce from "../workforce.js";
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
  authEvents: typeof authEvents;
  catalogue: typeof catalogue;
  commercialEvidence: typeof commercialEvidence;
  crons: typeof crons;
  demand: typeof demand;
  demo: typeof demo;
  demoPrices: typeof demoPrices;
  demoWorkspace: typeof demoWorkspace;
  dispatch: typeof dispatch;
  files: typeof files;
  households: typeof households;
  http: typeof http;
  identity: typeof identity;
  inbox: typeof inbox;
  industryNews: typeof industryNews;
  insights: typeof insights;
  integrationHttp: typeof integrationHttp;
  integrations: typeof integrations;
  "lib/access": typeof lib_access;
  "lib/admin": typeof lib_admin;
  "lib/adminRecovery": typeof lib_adminRecovery;
  "lib/applicationAccess": typeof lib_applicationAccess;
  "lib/catalogue": typeof lib_catalogue;
  "lib/chain": typeof lib_chain;
  "lib/commercialEvidence": typeof lib_commercialEvidence;
  "lib/commercialPricing": typeof lib_commercialPricing;
  "lib/dates": typeof lib_dates;
  "lib/demo": typeof lib_demo;
  "lib/demoFiles": typeof lib_demoFiles;
  "lib/demoPrices": typeof lib_demoPrices;
  "lib/dispatch": typeof lib_dispatch;
  "lib/drafts": typeof lib_drafts;
  "lib/ecosystem": typeof lib_ecosystem;
  "lib/households": typeof lib_households;
  "lib/industryNews": typeof lib_industryNews;
  "lib/integrationHttp": typeof lib_integrationHttp;
  "lib/integrationOpenapi": typeof lib_integrationOpenapi;
  "lib/integrations": typeof lib_integrations;
  "lib/inventory": typeof lib_inventory;
  "lib/lifecycle": typeof lib_lifecycle;
  "lib/messaging": typeof lib_messaging;
  "lib/notificationConfig": typeof lib_notificationConfig;
  "lib/notifications": typeof lib_notifications;
  "lib/onboarding": typeof lib_onboarding;
  "lib/phone": typeof lib_phone;
  "lib/phoneTwoFactor": typeof lib_phoneTwoFactor;
  "lib/photoEstimates": typeof lib_photoEstimates;
  "lib/photoProvider": typeof lib_photoProvider;
  "lib/pilot": typeof lib_pilot;
  "lib/publicData": typeof lib_publicData;
  "lib/push": typeof lib_push;
  "lib/pushCopy": typeof lib_pushCopy;
  "lib/review": typeof lib_review;
  "lib/securityAudit": typeof lib_securityAudit;
  "lib/sms": typeof lib_sms;
  "lib/smsLimits": typeof lib_smsLimits;
  "lib/validators": typeof lib_validators;
  "lib/views": typeof lib_views;
  "lib/workspace": typeof lib_workspace;
  market: typeof market;
  messaging: typeof messaging;
  notifications: typeof notifications;
  photoEstimates: typeof photoEstimates;
  pilot: typeof pilot;
  publicData: typeof publicData;
  push: typeof push;
  pushDelivery: typeof pushDelivery;
  pushState: typeof pushState;
  review: typeof review;
  saathi: typeof saathi;
  shop: typeof shop;
  sms: typeof sms;
  smsLimits: typeof smsLimits;
  stock: typeof stock;
  support: typeof support;
  workforce: typeof workforce;
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

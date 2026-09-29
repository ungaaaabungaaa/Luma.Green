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
import type * as applicationFiles from "../applicationFiles.js";
import type * as applications from "../applications.js";
import type * as auth from "../auth.js";
import type * as catalogue from "../catalogue.js";
import type * as demo from "../demo.js";
import type * as http from "../http.js";
import type * as identity from "../identity.js";
import type * as lib_access from "../lib/access.js";
import type * as lib_admin from "../lib/admin.js";
import type * as lib_applicationAccess from "../lib/applicationAccess.js";
import type * as lib_catalogue from "../lib/catalogue.js";
import type * as lib_chain from "../lib/chain.js";
import type * as lib_dates from "../lib/dates.js";
import type * as lib_demo from "../lib/demo.js";
import type * as lib_demoFiles from "../lib/demoFiles.js";
import type * as lib_drafts from "../lib/drafts.js";
import type * as lib_lifecycle from "../lib/lifecycle.js";
import type * as lib_onboarding from "../lib/onboarding.js";
import type * as lib_phone from "../lib/phone.js";
import type * as lib_sms from "../lib/sms.js";
import type * as lib_validators from "../lib/validators.js";
import type * as lib_views from "../lib/views.js";
import type * as lib_workspace from "../lib/workspace.js";
import type * as sms from "../sms.js";
import type * as support from "../support.js";
import type * as workspace from "../workspace.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  admin: typeof admin;
  applicationFiles: typeof applicationFiles;
  applications: typeof applications;
  auth: typeof auth;
  catalogue: typeof catalogue;
  demo: typeof demo;
  http: typeof http;
  identity: typeof identity;
  "lib/access": typeof lib_access;
  "lib/admin": typeof lib_admin;
  "lib/applicationAccess": typeof lib_applicationAccess;
  "lib/catalogue": typeof lib_catalogue;
  "lib/chain": typeof lib_chain;
  "lib/dates": typeof lib_dates;
  "lib/demo": typeof lib_demo;
  "lib/demoFiles": typeof lib_demoFiles;
  "lib/drafts": typeof lib_drafts;
  "lib/lifecycle": typeof lib_lifecycle;
  "lib/onboarding": typeof lib_onboarding;
  "lib/phone": typeof lib_phone;
  "lib/sms": typeof lib_sms;
  "lib/validators": typeof lib_validators;
  "lib/views": typeof lib_views;
  "lib/workspace": typeof lib_workspace;
  sms: typeof sms;
  support: typeof support;
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

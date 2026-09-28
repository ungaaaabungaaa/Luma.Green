/* eslint-disable unicorn/no-non-function-verb-prefix -- these are Convex
   mutations and queries, exported under the names Better Auth calls. */
import { createApi } from "@convex-dev/better-auth";

import { createAuthOptions } from "../auth";
import schema from "./schema";

/** The database functions Better Auth calls through the component. */
export const {
  create,
  findOne,
  findMany,
  updateOne,
  updateMany,
  deleteOne,
  deleteMany,
} = createApi(schema, createAuthOptions);

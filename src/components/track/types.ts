import type { FunctionReturnType } from "convex/server";

import type { api } from "../../../convex/_generated/api";

/** A booking as its tracking page gets it (never the household's contact). */
export type TrackedBooking = NonNullable<
  FunctionReturnType<typeof api.households.track>
>;

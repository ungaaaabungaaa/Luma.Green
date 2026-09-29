/* eslint-disable unicorn/no-top-level-side-effects -- Convex registers cron jobs at module load */
import { cronJobs } from "convex/server";

import { internal } from "./_generated/api";

/** Scheduled work. Each job's function lives in its own area's module. */
const crons = cronJobs();

// 06:00 IST is 00:30 UTC.
crons.daily(
  "price board",
  { hourUTC: 0, minuteUTC: 30 },
  internal.priceEngine.daily,
);
crons.interval("notifications", { minutes: 5 }, internal.notifications.scan);
crons.daily(
  "compliance reminders",
  { hourUTC: 2, minuteUTC: 0 },
  internal.rulebook.reminders,
);

export default crons;

import { cronJobs } from "convex/server";

import { internal } from "./_generated/api";
import { PUBLIC_DATA_CITIES } from "./lib/publicData";

const crons = cronJobs();
for (const [index, city] of PUBLIC_DATA_CITIES.entries()) {
  // Stagger cities, avoiding the provider's busy top-of-hour period.
  crons.hourly(
    `public-data-${city.id}`,
    { minuteUTC: 7 + index * 8 },
    internal.publicData.refreshCity,
    { city: city.id },
  );
}
export default crons;

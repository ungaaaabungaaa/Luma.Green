import type { TableNames } from "../_generated/dataModel";
import { adminExtrasTables } from "./adminExtras";
import { cityTables } from "./city";
import { creditsTables } from "./credits";
import { exportsTables } from "./exports";
import { floorTables } from "./floor";
import { grievanceTables } from "./grievance";
import { hazardTables } from "./hazard";
import { institutionsTables } from "./institutions";
import { kabadiTables } from "./kabadi";
import { logisticsTables } from "./logistics";
import { lotsTables } from "./lots";
import { marketExtrasTables } from "./marketExtras";
import { notificationsTables } from "./notifications";
import { onboardingTables } from "./onboarding";
import { paymentsTables } from "./payments";
import { priceEngineTables } from "./priceEngine";
import { rulebookTables } from "./rulebook";
import { solarTables } from "./solar";
import { supportTables } from "./support";
/** Every area's tables, spread into the schema; the demo reset clears them. */
import { worldTables } from "./world";

export const areaTables = {
  ...worldTables,
  ...lotsTables,
  ...floorTables,
  ...rulebookTables,
  ...priceEngineTables,
  ...logisticsTables,
  ...paymentsTables,
  ...exportsTables,
  ...institutionsTables,
  ...cityTables,
  ...grievanceTables,
  ...hazardTables,
  ...creditsTables,
  ...solarTables,
  ...supportTables,
  ...kabadiTables,
  ...marketExtrasTables,
  ...adminExtrasTables,
  ...notificationsTables,
  ...onboardingTables,
};

export const areaTableNames = Object.keys(areaTables) as TableNames[];

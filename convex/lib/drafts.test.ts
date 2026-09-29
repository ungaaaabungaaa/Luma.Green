import { describe, expect, it } from "vitest";

import {
  vApplicationKind,
  vApplicationStatus,
  vFileType,
  vMaterialFamily,
  vPcbBoard,
  vRadius,
  vSaathiTime,
  vSaathiVehicle,
  vSaathiWork,
  vShopVehicle,
  vWeekday,
} from "./drafts";
import { APPLICATION_STATUSES } from "./lifecycle";
import {
  APPLICATION_KINDS,
  FILE_TYPES,
  MATERIAL_FAMILIES,
  PCB_BOARDS,
  RADII_KM,
  SAATHI_TIMES,
  SAATHI_VEHICLES,
  SAATHI_WORK,
  SHOP_VEHICLES,
  WEEKDAYS,
} from "./onboarding";

const literals = (validator: { members: { value: unknown }[] }) =>
  validator.members.map((member) => member.value);

describe("Convex validators match the onboarding rules", () => {
  it.each([
    ["kinds", vApplicationKind, APPLICATION_KINDS],
    ["statuses", vApplicationStatus, APPLICATION_STATUSES],
    ["file types", vFileType, FILE_TYPES],
    ["weekdays", vWeekday, WEEKDAYS],
    ["shop vehicles", vShopVehicle, SHOP_VEHICLES],
    ["materials", vMaterialFamily, MATERIAL_FAMILIES],
    ["saathi work", vSaathiWork, SAATHI_WORK],
    ["saathi vehicles", vSaathiVehicle, SAATHI_VEHICLES],
    ["saathi times", vSaathiTime, SAATHI_TIMES],
    ["radii", vRadius, RADII_KM],
    ["boards", vPcbBoard, PCB_BOARDS],
  ] as const)("%s", (_name, validator, values) => {
    expect(literals(validator)).toEqual([...values]);
  });
});

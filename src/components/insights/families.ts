import {
  BoltIcon,
  GlassWaterIcon,
  type LucideIcon,
  MilkIcon,
  NewspaperIcon,
  PackageIcon,
  SmartphoneIcon,
} from "lucide-react";

import type { Family } from "../../../convex/lib/catalogue";

/** One icon per material family, so a family looks the same everywhere. */
export const FAMILY_ICONS: Record<Family, LucideIcon> = {
  paper: NewspaperIcon,
  plastic: MilkIcon,
  metal: BoltIcon,
  glass: GlassWaterIcon,
  ewaste: SmartphoneIcon,
  other: PackageIcon,
};

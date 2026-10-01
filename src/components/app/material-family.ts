import {
  CupSodaIcon,
  type LucideIcon,
  MagnetIcon,
  NewspaperIcon,
  ShirtIcon,
  SmartphoneIcon,
  WineIcon,
} from "lucide-react";

import type { Family } from "../../../convex/lib/catalogue";

/** Stable material symbols across household, shop, market and impact views. */
export const MATERIAL_FAMILY_ICONS: Record<Family, LucideIcon> = {
  paper: NewspaperIcon,
  plastic: CupSodaIcon,
  metal: MagnetIcon,
  glass: WineIcon,
  ewaste: SmartphoneIcon,
  other: ShirtIcon,
};

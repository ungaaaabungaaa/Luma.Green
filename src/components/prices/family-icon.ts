import {
  CupSodaIcon,
  type LucideIcon,
  MagnetIcon,
  NewspaperIcon,
  ShirtIcon,
  SmartphoneIcon,
  WineIcon,
} from "lucide-react";

import type { Family } from "./board";

/** One picture per material family, for readers who go by icons. */
export const FAMILY_ICONS: Record<Family, LucideIcon> = {
  paper: NewspaperIcon,
  plastic: CupSodaIcon,
  metal: MagnetIcon,
  glass: WineIcon,
  ewaste: SmartphoneIcon,
  other: ShirtIcon,
};

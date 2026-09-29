/**
 * Luma.Green's spot illustrations: small, flat, original drawings in the
 * brand greens and warm neutrals. Each is decorative (hidden from screen
 * readers) unless it's given a `title`.
 *
 * ```tsx
 * <KabadiShop className="max-w-40" />            // decorative
 * <EscrowShield title={t("escrowPicture")} />   // named picture
 * ```
 */
import { AutoPickup } from "./auto-pickup";
import { EscrowShield } from "./escrow-shield";
import { Factory } from "./factory";
import { Handshake } from "./handshake";
import { HouseholdScrap } from "./household-scrap";
import { KabadiShop } from "./kabadi-shop";
import { RecyclerMachine } from "./recycler-machine";
import { SaathiWorker } from "./saathi-worker";
import { SmsCodePhone } from "./sms-code-phone";
import { SolarRoof } from "./solar-roof";
import { WeighingScale } from "./weighing-scale";
import { YardBales } from "./yard-bales";

export { AutoPickup } from "./auto-pickup";
export { EscrowShield } from "./escrow-shield";
export { Factory } from "./factory";
export type { IllustrationProps } from "./frame";
export { Handshake } from "./handshake";
export { HouseholdScrap } from "./household-scrap";
export { KabadiShop } from "./kabadi-shop";
export { RecyclerMachine } from "./recycler-machine";
export { SaathiWorker } from "./saathi-worker";
export { SmsCodePhone } from "./sms-code-phone";
export { SolarRoof } from "./solar-roof";
export { WeighingScale } from "./weighing-scale";
export { YardBales } from "./yard-bales";

/** Every illustration by name, for content that picks one as data. */
export const illustrations = {
  autoPickup: AutoPickup,
  escrowShield: EscrowShield,
  factory: Factory,
  handshake: Handshake,
  householdScrap: HouseholdScrap,
  kabadiShop: KabadiShop,
  recyclerMachine: RecyclerMachine,
  saathiWorker: SaathiWorker,
  smsCodePhone: SmsCodePhone,
  solarRoof: SolarRoof,
  weighingScale: WeighingScale,
  yardBales: YardBales,
} as const;

export type IllustrationName = keyof typeof illustrations;

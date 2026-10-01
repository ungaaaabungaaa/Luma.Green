import {
  BadgeCheckIcon,
  FactoryIcon,
  HandHelpingIcon,
  HandshakeIcon,
  LockIcon,
  type LucideIcon,
  ReceiptTextIcon,
  StoreIcon,
  TruckIcon,
} from "lucide-react";
import { getFormatter, getTranslations } from "next-intl/server";
import type { ReactNode } from "react";

/** One norm of the standard: what it is on the left, how on the right. */
export function NormSection({
  id,
  icon: Icon,
  title,
  body,
  children,
}: {
  id: string;
  icon: LucideIcon;
  title: string;
  body: string;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      className="grid scroll-mt-24 gap-6 border-t pt-12 lg:grid-cols-[1fr_2fr] lg:gap-12"
    >
      <div className="flex flex-col gap-3">
        <span className="flex size-11 items-center justify-center rounded-lg border bg-muted text-primary">
          <Icon aria-hidden className="size-5" />
        </span>
        <h2
          id={`${id}-title`}
          className="font-display text-2xl font-semibold tracking-tight text-balance"
        >
          {title}
        </h2>
        <p className="text-muted-foreground">{body}</p>
      </div>
      <div className="min-w-0">{children}</div>
    </section>
  );
}

/** Three short rules, each with an icon, side by side on wide screens. */
export function RuleCards({
  rules,
}: {
  rules: readonly {
    key: string;
    icon: LucideIcon;
    title: string;
    body: string;
  }[];
}) {
  return (
    <ul className="grid grid-flow-dense divide-y border-y sm:grid-cols-3 sm:divide-x sm:divide-y-0 rtl:sm:divide-x-reverse">
      {rules.map(({ key, icon: Icon, title, body }) => (
        <li key={key} className="flex flex-col gap-3 py-5 sm:px-5">
          <Icon aria-hidden className="size-6 text-primary" />
          <h3 className="font-semibold">{title}</h3>
          <p className="text-sm text-muted-foreground">{body}</p>
        </li>
      ))}
    </ul>
  );
}

const receiptFields = [
  "number",
  "time",
  "seller",
  "buyer",
  "code",
  "weight",
  "rate",
  "total",
] as const;

/** The fields every receipt carries, drawn as a blank receipt. */
export async function ReceiptAnatomy() {
  const t = await getTranslations("standards.custody");
  return (
    <figure
      aria-labelledby="receipt-anatomy-title"
      className="mx-auto w-full max-w-md rounded-xl border bg-card p-5 shadow-sm lg:mx-0"
    >
      <figcaption
        id="receipt-anatomy-title"
        className="mb-3 flex items-center gap-2 font-semibold"
      >
        <ReceiptTextIcon aria-hidden className="size-5 text-primary" />
        {t("receiptTitle")}
      </figcaption>
      <ul className="divide-y divide-dashed">
        {receiptFields.map((field) => (
          <li
            key={field}
            className="flex items-center justify-between gap-4 py-2.5 text-sm"
          >
            <span>{t(`fields.${field}`)}</span>
            <span
              aria-hidden
              className="h-2 w-16 shrink-0 rounded-full bg-muted"
            />
          </li>
        ))}
      </ul>
    </figure>
  );
}

/** Who is checked for what before they can trade. */
export async function VerificationList() {
  const t = await getTranslations("standards.verification");
  const items = [
    { key: "business", icon: StoreIcon },
    { key: "consent", icon: FactoryIcon },
    { key: "saathi", icon: HandHelpingIcon },
  ] as const;
  return (
    <ul className="flex flex-col divide-y border-y">
      {items.map(({ key, icon: Icon }) => (
        <li key={key} className="flex items-start gap-3 py-5">
          <Icon aria-hidden className="mt-0.5 size-5 shrink-0 text-primary" />
          <span>{t(key)}</span>
        </li>
      ))}
    </ul>
  );
}

/** A business trade, step by step: the money waits until the goods arrive. */
export async function EscrowSteps() {
  const [t, format] = await Promise.all([
    getTranslations("standards.escrow.steps"),
    getFormatter(),
  ]);
  const steps = [
    { key: "accepted", icon: HandshakeIcon },
    { key: "paid", icon: LockIcon },
    { key: "dispatched", icon: TruckIcon },
    { key: "released", icon: BadgeCheckIcon },
  ] as const;
  return (
    <ol className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {steps.map(({ key, icon: Icon }, index) => (
        <li
          key={key}
          className="flex flex-col gap-3 rounded-xl border bg-card p-4"
        >
          <span className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
              {format.number(index + 1)}
            </span>
            <Icon aria-hidden className="size-5 text-primary" />
          </span>
          <p className="font-medium">{t(key)}</p>
        </li>
      ))}
    </ol>
  );
}

import {
  FactoryIcon,
  HandHelpingIcon,
  HouseIcon,
  IndianRupeeIcon,
  type LucideIcon,
  RecycleIcon,
  StoreIcon,
  WarehouseIcon,
} from "lucide-react";
import { getFormatter, getTranslations } from "next-intl/server";

import { cn } from "@/lib/utils";

import { Container } from "../container";
import { SectionHeading } from "../section-heading";

/** The chain in the order material moves through it. */
const steps = [
  { key: "household", icon: HouseIcon },
  { key: "kabadiwala", icon: StoreIcon },
  { key: "yard", icon: WarehouseIcon },
  { key: "recycler", icon: RecycleIcon },
  { key: "manufacturer", icon: FactoryIcon },
] as const satisfies readonly { key: string; icon: LucideIcon }[];

/** A step's badge: the role's icon in brand rings, numbered in order. */
function StepNode({
  icon: Icon,
  number,
}: {
  icon: LucideIcon;
  number: string;
}) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 80 80"
      className="size-14 shrink-0 overflow-visible md:size-20"
    >
      <circle
        cx="40"
        cy="40"
        r="38"
        strokeWidth="2"
        className="fill-brand-50 stroke-brand-200"
      />
      <circle
        cx="40"
        cy="40"
        r="27"
        strokeWidth="2"
        className="fill-card stroke-brand-600"
      />
      <Icon
        x={27}
        y={27}
        width={26}
        height={26}
        strokeWidth={1.75}
        className="text-brand-800"
      />
      <circle cx="67" cy="13" r="11" className="fill-primary" />
      <text
        x="67"
        y="13"
        dy="0.35em"
        textAnchor="middle"
        className="fill-primary-foreground text-[12px] font-semibold"
      >
        {number}
      </text>
    </svg>
  );
}

/** Phones: the arrow down from one step to the next. */
function DownArrow() {
  return (
    <svg aria-hidden className="min-h-10 w-3 flex-1 overflow-visible md:hidden">
      <line
        x1="50%"
        y1="6"
        x2="50%"
        y2="100%"
        strokeWidth="2"
        className="stroke-brand-300"
      />
      <svg x="50%" y="100%" overflow="visible">
        <path
          d="M-5 -8 L0 -2 L5 -8"
          fill="none"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="stroke-brand-700"
        />
      </svg>
    </svg>
  );
}

/**
 * Wider screens: the arrow across to the next step, from this node's edge
 * to the next one's. It flips with the reading direction.
 */
function AcrossArrow() {
  return (
    <svg
      aria-hidden
      className="absolute start-[calc(50%+3rem)] top-[34px] hidden h-3 w-[calc(100%-6rem)] overflow-visible md:block rtl:-scale-x-100"
    >
      <line
        x1="0"
        y1="50%"
        x2="100%"
        y2="50%"
        strokeWidth="2"
        className="stroke-brand-300"
      />
      <svg x="100%" y="50%" overflow="visible">
        <path
          d="M-8 -5 L-2 0 L-8 5"
          fill="none"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="stroke-brand-700"
        />
      </svg>
    </svg>
  );
}

/** Wider screens: a bracket from every step down to what spans them all. */
function EveryStepBracket() {
  const centres = ["10%", "30%", "50%", "70%", "90%"];
  return (
    <svg aria-hidden className="hidden h-8 w-full overflow-visible md:block">
      {centres.map((x) => (
        <line
          key={x}
          x1={x}
          y1="0"
          x2={x}
          y2="12"
          strokeWidth="2"
          strokeLinecap="round"
          className="stroke-brand-200"
        />
      ))}
      <line
        x1="10%"
        y1="12"
        x2="90%"
        y2="12"
        strokeWidth="2"
        strokeLinecap="round"
        className="stroke-brand-200"
      />
      <line
        x1="50%"
        y1="12"
        x2="50%"
        y2="32"
        strokeWidth="2"
        strokeLinecap="round"
        className="stroke-brand-200"
      />
    </svg>
  );
}

function Lane({ icon: Icon, text }: { icon: LucideIcon; text: string }) {
  return (
    <p className="flex items-start gap-3 rounded-2xl border bg-card p-4">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-50 text-primary">
        <Icon aria-hidden className="size-5" />
      </span>
      <span className="self-center">{text}</span>
    </p>
  );
}

/** Households → kabadiwalas → yards → recyclers → manufacturers, drawn. */
export async function ChainDiagram() {
  const [t, format] = await Promise.all([
    getTranslations("home.chain"),
    getFormatter(),
  ]);

  return (
    <section aria-labelledby="chain-heading" className="py-20">
      <Container className="flex flex-col gap-12">
        <SectionHeading
          id="chain-heading"
          title={t("heading")}
          intro={t("intro")}
        />
        <div className="flex flex-col gap-4 md:gap-2">
          <ol className="grid md:grid-cols-5">
            {steps.map(({ key, icon }, index) => {
              const isLast = index === steps.length - 1;
              return (
                <li
                  key={key}
                  className="relative grid grid-cols-[3.5rem_minmax(0,1fr)] gap-x-4 md:flex md:flex-col md:items-center md:gap-4 md:text-center"
                >
                  <div className="flex flex-col items-center gap-1">
                    <StepNode icon={icon} number={format.number(index + 1)} />
                    {isLast ? null : <DownArrow />}
                  </div>
                  <div
                    className={cn(
                      "flex flex-col gap-1 pt-2 md:px-2 md:pt-0",
                      isLast ? "pb-2" : "pb-8 md:pb-0",
                    )}
                  >
                    <h3 className="text-lg font-semibold md:text-base lg:text-lg">
                      {t(`steps.${key}.name`)}
                    </h3>
                    <p className="text-muted-foreground md:text-sm lg:text-base">
                      {t(`steps.${key}.body`)}
                    </p>
                  </div>
                  {isLast ? null : <AcrossArrow />}
                </li>
              );
            })}
          </ol>
          <EveryStepBracket />
          <div className="grid gap-3 md:grid-cols-2 md:gap-4">
            <Lane icon={IndianRupeeIcon} text={t("money")} />
            <Lane icon={HandHelpingIcon} text={t("saathi")} />
          </div>
        </div>
      </Container>
    </section>
  );
}

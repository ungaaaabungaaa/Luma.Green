import { IllustrationFrame, type IllustrationProps } from "./frame";

const GEAR =
  "M144.3 102.2L147.9 102.5L147.9 105.5L144.3 105.8L142.6 110L144.9 112.8L142.8 114.9L140 112.6L135.8 114.3L135.5 117.9L132.5 117.9L132.2 114.3L128 112.6L125.2 114.9L123.1 112.8L125.4 110L123.7 105.8L120.1 105.5L120.1 102.5L123.7 102.2L125.4 98L123.1 95.2L125.2 93.1L128 95.4L132.2 93.7L132.5 90.1L135.5 90.1L135.8 93.7L140 95.4L142.8 93.1L144.9 95.2L142.6 98Z";

const PELLETS = [
  { cx: 160, fill: "fill-brand-400" },
  { cx: 167, fill: "fill-brand-300" },
  { cx: 176, fill: "fill-brand-500" },
  { cx: 186, fill: "fill-brand-400" },
  { cx: 194, fill: "fill-brand-300" },
] as const;

/** A recycling line: bottles into the hopper, pellets off the conveyor. */
export function RecyclerMachine(props: IllustrationProps) {
  return (
    <IllustrationFrame {...props}>
      {/* Bottles waiting */}
      <path
        d="M22 156l4-18h10l4 18ZM40 156l3-22h9l3 22Z"
        className="fill-sky-200"
      />
      <rect
        x="27"
        y="133"
        width="8"
        height="5"
        rx="1"
        className="fill-brand-600"
      />
      <rect
        x="43"
        y="129"
        width="8"
        height="5"
        rx="1"
        className="fill-brand-600"
      />

      {/* Hopper */}
      <rect
        x="54"
        y="42"
        width="68"
        height="6"
        rx="2"
        className="fill-stone-500"
      />
      <path d="M58 48h60l-14 26H72Z" className="fill-stone-400" />

      {/* Machine body */}
      <rect x="68" y="140" width="8" height="16" className="fill-stone-600" />
      <rect x="138" y="140" width="8" height="16" className="fill-stone-600" />
      <rect
        x="62"
        y="74"
        width="90"
        height="66"
        rx="6"
        className="fill-brand-700"
      />
      <rect
        x="72"
        y="86"
        width="40"
        height="32"
        rx="4"
        className="fill-brand-900"
      />
      <circle cx="84" cy="98" r="6" className="fill-brand-300" />
      <circle cx="100" cy="98" r="6" className="fill-brand-300" />
      <path
        d="M84 98l3-4M100 98l-4-2"
        className="stroke-brand-900"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <circle cx="80" cy="111" r="2.5" className="fill-amber-300" />
      <circle cx="88" cy="111" r="2.5" className="fill-brand-400" />
      <circle cx="96" cy="111" r="2.5" className="fill-brand-400" />
      <path d={GEAR} className="fill-brand-400" />
      <circle cx="134" cy="104" r="4" className="fill-brand-700" />

      {/* Chute and conveyor */}
      <path d="M152 112h12l10 16h-22Z" className="fill-stone-500" />
      <rect x="188" y="136" width="5" height="20" className="fill-stone-600" />
      <rect
        x="150"
        y="128"
        width="62"
        height="8"
        rx="4"
        className="fill-stone-700"
      />
      {[156, 170, 184, 198].map((cx) => (
        <circle key={cx} cx={cx} cy="132" r="2.5" className="fill-stone-400" />
      ))}
      {PELLETS.map(({ cx, fill }) => (
        <circle key={cx} cx={cx} cy="125" r="3" className={fill} />
      ))}

      {/* Bin of pellets */}
      <path d="M204 142c4-10 24-10 28 0Z" className="fill-brand-400" />
      <rect
        x="202"
        y="140"
        width="32"
        height="16"
        rx="3"
        className="fill-brand-800"
      />
    </IllustrationFrame>
  );
}

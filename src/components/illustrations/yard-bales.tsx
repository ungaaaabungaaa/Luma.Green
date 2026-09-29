import { IllustrationFrame, type IllustrationProps } from "./frame";

interface Bale {
  x: number;
  y: number;
  body: string;
  grain: string;
}

/** Bottom row, then top row: paper, cardboard and plastic, strapped. */
const BALES: readonly Bale[] = [
  { x: 54, y: 120, body: "fill-stone-100", grain: "stroke-stone-300" },
  { x: 98, y: 120, body: "fill-orange-200", grain: "stroke-orange-300" },
  { x: 142, y: 120, body: "fill-sky-200", grain: "stroke-sky-300" },
  { x: 76, y: 88, body: "fill-sky-200", grain: "stroke-sky-300" },
  { x: 120, y: 88, body: "fill-stone-100", grain: "stroke-stone-300" },
];

function BaleShape({ x, y, body, grain }: Bale) {
  const left = String(x);
  const top = String(y);
  return (
    <g>
      <rect x={x} y={y} width="44" height="32" rx="2" className={body} />
      <path
        d={`M${left} ${top}m5 9h34m-34 7h30m-30 7h34`}
        className={grain}
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d={`M${left} ${top}m14 0v32m16-32v32`}
        className="stroke-stone-600"
        strokeWidth="1.5"
      />
    </g>
  );
}

/** A yard: an open shed and strapped bales stacked on a pallet. */
export function YardBales(props: IllustrationProps) {
  return (
    <IllustrationFrame {...props}>
      {/* Shed */}
      <rect x="46" y="62" width="148" height="94" className="fill-stone-300" />
      <path d="M36 66 120 30l84 36Z" className="fill-brand-700" />
      <rect
        x="36"
        y="62"
        width="168"
        height="8"
        rx="2"
        className="fill-brand-800"
      />
      <rect x="44" y="70" width="6" height="86" className="fill-stone-400" />
      <rect x="190" y="70" width="6" height="86" className="fill-stone-400" />

      {/* Bales on a pallet */}
      <rect
        x="50"
        y="152"
        width="140"
        height="5"
        rx="1"
        className="fill-amber-700"
      />
      {BALES.map((bale) => (
        <BaleShape key={`${String(bale.x)}-${String(bale.y)}`} {...bale} />
      ))}

      {/* A loose bale outside the shed */}
      <rect
        x="200"
        y="134"
        width="30"
        height="22"
        rx="2"
        className="fill-orange-200"
      />
      <path
        d="M204 141h22M204 148h22"
        className="stroke-orange-300"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path d="M215 134v22" className="stroke-brand-900" strokeWidth="2" />
    </IllustrationFrame>
  );
}

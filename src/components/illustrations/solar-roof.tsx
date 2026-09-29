import { IllustrationFrame, type IllustrationProps } from "./frame";

const PANELS = [66, 102, 138];
const RAYS = [0, 45, 90, 135, 180, 225, 270, 315];

function Panel({ x }: { x: number }) {
  const at = (dx: number, y: number) => `${String(x + dx)} ${String(y)}`;
  return (
    <g>
      <path
        d={`M${at(6, 80)}V88M${at(34, 60)}V88`}
        className="stroke-stone-500"
        strokeWidth="2"
      />
      <path
        d={`M${at(0, 80)}L${at(30, 80)}L${at(38, 58)}L${at(8, 58)}Z`}
        className="fill-sky-800"
      />
      <path
        d={`M${at(10, 80)}L${at(18, 58)}M${at(20, 80)}L${at(28, 58)}M${at(4, 69)}L${at(34, 69)}`}
        className="stroke-sky-400"
        strokeWidth="1"
      />
    </g>
  );
}

/** A Bengaluru-style flat-roofed house with solar panels on the terrace. */
export function SolarRoof(props: IllustrationProps) {
  return (
    <IllustrationFrame {...props}>
      {/* Sun */}
      {RAYS.map((angle) => (
        <path
          key={angle}
          d="M196 22v-6"
          transform={`rotate(${String(angle)} 196 40)`}
          className="stroke-amber-400"
          strokeWidth="3"
          strokeLinecap="round"
        />
      ))}
      <circle cx="196" cy="40" r="12" className="fill-amber-300" />

      {/* House */}
      <rect x="62" y="92" width="116" height="64" className="fill-orange-50" />
      {PANELS.map((x) => (
        <Panel key={x} x={x} />
      ))}
      <rect
        x="58"
        y="86"
        width="124"
        height="8"
        rx="2"
        className="fill-stone-300"
      />
      <rect
        x="74"
        y="108"
        width="22"
        height="20"
        rx="2"
        className="fill-sky-100"
      />
      <rect
        x="144"
        y="108"
        width="22"
        height="20"
        rx="2"
        className="fill-sky-100"
      />
      <path d="M108 156v-30a12 12 0 0 1 24 0v30Z" className="fill-brand-800" />

      {/* Plant */}
      <path d="M36 156l-3-14h20l-3 14Z" className="fill-amber-700" />
      <path
        d="M43 142c-6-8-6-18 0-24 6 6 6 16 0 24Z"
        className="fill-brand-500"
      />
      <path
        d="M43 142c-10-2-16-8-16-14 8 0 14 6 16 14Z"
        className="fill-brand-400"
      />
      <path
        d="M43 142c10-2 16-8 16-14-8 0-14 6-16 14Z"
        className="fill-brand-400"
      />
    </IllustrationFrame>
  );
}

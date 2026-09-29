import { IllustrationFrame, type IllustrationProps } from "./frame";

const WINDOWS = [58, 82, 106, 130].flatMap((x) => [
  { x, y: 92 },
  { x, y: 114 },
]);

/** A clean factory: sawtooth roof, leaves for smoke, rolls of recycled paper. */
export function Factory(props: IllustrationProps) {
  return (
    <IllustrationFrame {...props}>
      {/* Chimney with leaves instead of smoke */}
      <rect x="164" y="36" width="14" height="46" className="fill-stone-400" />
      <rect x="164" y="42" width="14" height="4" className="fill-brand-600" />
      <path
        d="M170 30c-8-4-10-12-6-18 8 4 10 12 6 18Z"
        className="fill-brand-400"
      />
      <path
        d="M176 22c2-8 10-12 16-10-2 8-10 12-16 10Z"
        className="fill-brand-300"
      />

      {/* Building */}
      <rect x="46" y="80" width="146" height="76" className="fill-stone-100" />
      <path
        d="M46 82V62l36 20V62l36 20V62l36 20V62l38 20Z"
        className="fill-brand-700"
      />
      <path
        d="M47 64v16M83 64v16M119 64v16M155 64v16"
        className="stroke-sky-200"
        strokeWidth="3"
      />
      {WINDOWS.map(({ x, y }) => (
        <rect
          key={`${String(x)}-${String(y)}`}
          x={x}
          y={y}
          width="16"
          height="12"
          rx="2"
          className="fill-sky-100"
        />
      ))}
      <rect x="156" y="112" width="28" height="44" className="fill-brand-800" />
      <path
        d="M156 120h28M156 128h28M156 136h28M156 144h28"
        className="stroke-brand-900"
        strokeWidth="1.5"
      />

      {/* Rolls of recycled kraft paper */}
      <circle cx="30" cy="146" r="10" className="fill-orange-300" />
      <circle cx="30" cy="146" r="4" className="fill-orange-100" />
      <circle cx="51" cy="146" r="10" className="fill-orange-300" />
      <circle cx="51" cy="146" r="4" className="fill-orange-100" />
      <circle cx="40.5" cy="128" r="10" className="fill-orange-300" />
      <circle cx="40.5" cy="128" r="4" className="fill-orange-100" />

      {/* Sacks of pellets */}
      <path
        d="M198 156c-4-10-2-20 4-24h16c6 4 8 14 4 24Z"
        className="fill-brand-500"
      />
      <path d="M202 132h16" className="stroke-brand-800" strokeWidth="3" />
    </IllustrationFrame>
  );
}

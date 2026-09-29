import { IllustrationFrame, type IllustrationProps } from "./frame";

/** A Saathi in a green vest, cap and work gloves, waving, with a sack. */
export function SaathiWorker(props: IllustrationProps) {
  return (
    <IllustrationFrame {...props}>
      {/* Raised arm, waving */}
      <g transform="rotate(-140 142 66)">
        <rect
          x="138"
          y="62"
          width="10"
          height="18"
          rx="4"
          className="fill-sky-200"
        />
        <rect
          x="139"
          y="78"
          width="8"
          height="22"
          rx="4"
          className="fill-orange-300"
        />
        <rect
          x="137"
          y="96"
          width="12"
          height="13"
          rx="5"
          className="fill-amber-400"
        />
      </g>

      {/* Legs and shoes */}
      <rect
        x="106"
        y="110"
        width="13"
        height="42"
        rx="3"
        className="fill-stone-700"
      />
      <rect
        x="121"
        y="110"
        width="13"
        height="42"
        rx="3"
        className="fill-stone-700"
      />
      <path d="M100 156a9 6 0 0 1 9-6h10v6Z" className="fill-stone-800" />
      <path d="M140 156a9 6 0 0 0-9-6h-10v6Z" className="fill-stone-800" />

      {/* Shirt and vest */}
      <path
        d="M100 72c0-8 6-12 12-12h16c6 0 12 4 12 12v42h-40Z"
        className="fill-sky-200"
      />
      <path
        d="M100 72c0-8 6-12 12-12h3l4 14v40h-19ZM140 72c0-8-6-12-12-12h-3l-4 14v40h19Z"
        className="fill-brand-600"
      />
      <path
        d="M100 98h19M121 98h19"
        className="stroke-amber-200"
        strokeWidth="4"
      />
      <rect
        x="126"
        y="80"
        width="9"
        height="6"
        rx="1"
        className="fill-brand-100"
      />

      {/* Lowered arm with a sack */}
      <path
        d="M80 110c-6 14-6 30 0 44h28c6-14 6-30 0-44Z"
        className="fill-stone-300"
      />
      <path
        d="M82 112h24"
        className="stroke-amber-700"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <rect
        x="92"
        y="62"
        width="10"
        height="18"
        rx="4"
        className="fill-sky-200"
      />
      <rect
        x="93"
        y="78"
        width="8"
        height="24"
        rx="4"
        className="fill-orange-300"
      />
      <rect
        x="91"
        y="98"
        width="12"
        height="14"
        rx="5"
        className="fill-amber-400"
      />

      {/* Head and cap */}
      <rect x="115" y="50" width="10" height="12" className="fill-orange-300" />
      <circle cx="120" cy="44" r="13" className="fill-orange-300" />
      <path
        d="M107 42c0-10 6-15 13-15s13 5 13 15Z"
        className="fill-brand-800"
      />
      <path d="M126 40h14c2 0 2 3 0 3h-14Z" className="fill-brand-800" />
      <circle cx="115" cy="46" r="1.5" className="fill-stone-800" />
      <circle cx="124" cy="46" r="1.5" className="fill-stone-800" />
      <path
        d="M116 51c2 2 6 2 8 0"
        className="stroke-stone-800"
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
      />
    </IllustrationFrame>
  );
}

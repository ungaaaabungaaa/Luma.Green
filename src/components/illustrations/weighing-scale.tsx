import { IllustrationFrame, type IllustrationProps } from "./frame";

/** A platform scale with a box and newspapers on it, reading 12.5. */
export function WeighingScale(props: IllustrationProps) {
  return (
    <IllustrationFrame {...props}>
      {/* Display on its pole */}
      <rect x="170" y="66" width="8" height="48" className="fill-stone-500" />
      <rect
        x="148"
        y="36"
        width="56"
        height="34"
        rx="6"
        className="fill-brand-900"
      />
      <rect
        x="154"
        y="42"
        width="44"
        height="22"
        rx="3"
        className="fill-brand-950"
      />
      <path
        d="M162 47v12M167 47h6v6h-6v6h6M190 47h-6v6h6v6h-6"
        className="stroke-brand-300"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <circle cx="178.5" cy="59" r="1.5" className="fill-brand-300" />

      {/* Scale body */}
      <rect
        x="54"
        y="118"
        width="132"
        height="30"
        rx="6"
        className="fill-stone-400"
      />
      <rect
        x="48"
        y="110"
        width="144"
        height="10"
        rx="4"
        className="fill-stone-300"
      />
      <rect
        x="62"
        y="146"
        width="14"
        height="10"
        rx="2"
        className="fill-stone-600"
      />
      <rect
        x="164"
        y="146"
        width="14"
        height="10"
        rx="2"
        className="fill-stone-600"
      />
      <rect
        x="104"
        y="126"
        width="32"
        height="14"
        rx="3"
        className="fill-stone-500"
      />

      {/* Box on the scale */}
      <path d="M64 80h42l6-8H70Z" className="fill-orange-300" />
      <rect
        x="64"
        y="80"
        width="42"
        height="30"
        rx="2"
        className="fill-orange-200"
      />
      <rect x="81" y="80" width="8" height="30" className="fill-orange-300" />

      {/* Newspapers on the scale */}
      <rect
        x="110"
        y="92"
        width="40"
        height="18"
        rx="2"
        className="fill-stone-50"
      />
      <path
        d="M114 98h32M114 104h32"
        className="stroke-stone-300"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path d="M130 92v18" className="stroke-amber-700" strokeWidth="2" />

      {/* Tick: the weight is recorded */}
      <circle cx="54" cy="52" r="14" className="fill-brand-500" />
      <path
        d="m47 52 5 5 9-10"
        className="stroke-white"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </IllustrationFrame>
  );
}

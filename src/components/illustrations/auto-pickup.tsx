import { IllustrationFrame, type IllustrationProps } from "./frame";

/** A green-and-yellow auto-rickshaw with scrap tied on the roof. */
export function AutoPickup(props: IllustrationProps) {
  return (
    <IllustrationFrame {...props}>
      {/* Speed lines */}
      <path
        d="M186 98h24M192 112h22M186 126h18"
        className="stroke-brand-300"
        strokeWidth="4"
        strokeLinecap="round"
      />

      {/* Load on the roof */}
      <path
        d="M86 50c-4-10 2-20 12-22h18c10 2 14 12 10 22Z"
        className="fill-stone-300"
      />
      <rect
        x="128"
        y="32"
        width="34"
        height="18"
        rx="2"
        className="fill-orange-200"
      />
      <rect x="141" y="32" width="7" height="18" className="fill-orange-300" />
      <path
        d="M84 42h80"
        className="stroke-amber-700"
        strokeWidth="2.5"
        strokeLinecap="round"
      />

      {/* Canopy */}
      <path
        d="M62 64c2-10 10-14 20-14h78c8 0 12 4 14 12l2 6H62Z"
        className="fill-stone-800"
      />

      {/* Cabin */}
      <path d="M64 68h112v40H56Z" className="fill-amber-300" />
      <path d="M72 72h14l-8 32H62Z" className="fill-sky-100" />
      <rect x="92" y="72" width="44" height="34" className="fill-stone-700" />
      <rect
        x="98"
        y="88"
        width="34"
        height="12"
        rx="3"
        className="fill-brand-800"
      />
      <rect
        x="142"
        y="74"
        width="28"
        height="16"
        rx="3"
        className="fill-amber-200"
      />

      {/* Body */}
      <path
        d="M44 108h134v22a6 6 0 0 1-6 6H50a6 6 0 0 1-6-6Z"
        className="fill-brand-600"
      />
      <path d="M44 116h134" className="stroke-brand-800" strokeWidth="2" />
      <circle cx="50" cy="104" r="7" className="fill-stone-800" />
      <circle cx="50" cy="104" r="4" className="fill-amber-100" />

      {/* Wheels */}
      <circle cx="72" cy="141" r="15" className="fill-stone-800" />
      <circle cx="72" cy="141" r="6" className="fill-stone-300" />
      <circle cx="154" cy="141" r="15" className="fill-stone-800" />
      <circle cx="154" cy="141" r="6" className="fill-stone-300" />
    </IllustrationFrame>
  );
}

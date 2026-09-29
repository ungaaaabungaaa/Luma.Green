import { IllustrationFrame, type IllustrationProps } from "./frame";

/** A home with its scrap ready at the door: a box, newspapers and a sack. */
export function HouseholdScrap(props: IllustrationProps) {
  return (
    <IllustrationFrame {...props}>
      {/* House */}
      <rect x="76" y="70" width="90" height="86" className="fill-orange-50" />
      <path d="M64 76 121 36l57 40Z" className="fill-brand-700" />
      <rect
        x="64"
        y="72"
        width="114"
        height="8"
        rx="2"
        className="fill-brand-800"
      />
      <rect
        x="84"
        y="90"
        width="20"
        height="20"
        rx="2"
        className="fill-sky-100"
      />
      <rect
        x="138"
        y="90"
        width="20"
        height="20"
        rx="2"
        className="fill-sky-100"
      />
      <path
        d="M94 90v20M84 100h20M148 90v20M138 100h20"
        className="stroke-orange-50"
        strokeWidth="2"
      />
      <path d="M108 156v-40a13 13 0 0 1 26 0v40Z" className="fill-brand-800" />
      <circle cx="128" cy="136" r="2" className="fill-amber-300" />
      <rect
        x="102"
        y="153"
        width="38"
        height="4"
        rx="1"
        className="fill-stone-300"
      />

      {/* Cardboard box */}
      <path d="M30 124h40l6-8H36Z" className="fill-orange-300" />
      <rect
        x="30"
        y="124"
        width="40"
        height="32"
        rx="2"
        className="fill-orange-200"
      />
      <rect x="46" y="124" width="8" height="32" className="fill-orange-300" />

      {/* Tied newspapers */}
      <rect
        x="72"
        y="138"
        width="32"
        height="18"
        rx="2"
        className="fill-stone-50"
      />
      <path
        d="M75 144h26M75 150h26"
        className="stroke-stone-300"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path d="M88 138v18" className="stroke-amber-700" strokeWidth="2" />

      {/* Sack of bottles */}
      <path
        d="M156 112h9l-2 12h-5ZM170 108h9l-2 16h-5Z"
        className="fill-sky-200"
      />
      <rect
        x="156"
        y="108"
        width="9"
        height="5"
        rx="1"
        className="fill-brand-600"
      />
      <rect
        x="170"
        y="104"
        width="9"
        height="5"
        rx="1"
        className="fill-brand-600"
      />
      <path
        d="M150 156c-10-10-10-28 0-36l4-4h28l4 4c10 8 10 26 0 36Z"
        className="fill-stone-300"
      />
      <path
        d="M152 121h32"
        className="stroke-amber-700"
        strokeWidth="3"
        strokeLinecap="round"
      />

      {/* Leaves by the door */}
      <path
        d="M196 156c-2-12 2-22 12-26-1 12-5 20-12 26Z"
        className="fill-brand-500"
      />
      <path
        d="M196 156c-6-8-16-10-22-8 4 8 12 10 22 8Z"
        className="fill-brand-400"
      />
    </IllustrationFrame>
  );
}

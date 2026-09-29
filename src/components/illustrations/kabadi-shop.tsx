import { IllustrationFrame, type IllustrationProps } from "./frame";

const STRIPES = Array.from({ length: 8 }, (_, index) => 48 + index * 18);

/** A kabadi shop: signboard, striped awning and a hanging brass scale. */
export function KabadiShop(props: IllustrationProps) {
  return (
    <IllustrationFrame {...props}>
      {/* Shop body and dark interior */}
      <rect x="52" y="60" width="136" height="96" className="fill-orange-100" />
      <rect x="62" y="70" width="116" height="52" className="fill-stone-700" />

      {/* Shelf with scrap */}
      <rect x="62" y="96" width="116" height="3" className="fill-stone-500" />
      <path
        d="M68 96v-14h7v14ZM78 96V80h7v16ZM152 96V84h10v12ZM164 96V86h9v10Z"
        className="fill-sky-200"
      />
      <rect x="67" y="80" width="9" height="3" className="fill-brand-500" />
      <rect x="77" y="78" width="9" height="3" className="fill-brand-500" />
      <rect x="138" y="86" width="12" height="10" className="fill-orange-200" />

      {/* Signboard */}
      <rect
        x="48"
        y="28"
        width="144"
        height="26"
        rx="4"
        className="fill-brand-700"
      />
      <circle cx="64" cy="41" r="7" className="fill-brand-400" />
      <path d="M61 44c0-5 3-8 7-8 0 5-3 8-7 8Z" className="fill-brand-900" />
      <rect
        x="78"
        y="36"
        width="64"
        height="5"
        rx="2.5"
        className="fill-brand-100"
      />
      <rect
        x="78"
        y="44"
        width="40"
        height="4"
        rx="2"
        className="fill-brand-300"
      />

      {/* Awning */}
      {STRIPES.map((x, index) => (
        <path
          key={x}
          d={`M${String(x)} 54h18v12a9 9 0 0 1-18 0Z`}
          className={index % 2 === 0 ? "fill-brand-600" : "fill-orange-50"}
        />
      ))}

      {/* Hanging balance */}
      <path d="M120 74v8" className="stroke-stone-400" strokeWidth="2" />
      <rect
        x="94"
        y="82"
        width="52"
        height="4"
        rx="2"
        className="fill-amber-500"
      />
      <path
        d="M98 86l-8 20M98 86l8 20M142 86l-8 20M142 86l8 20"
        className="stroke-stone-300"
        strokeWidth="1.5"
      />
      <path d="M86 106h24a12 6 0 0 1-24 0Z" className="fill-amber-400" />
      <path d="M130 106h24a12 6 0 0 1-24 0Z" className="fill-amber-400" />
      <path d="M93 106l2-6h6l2 6Z" className="fill-stone-900" />
      <rect
        x="134"
        y="98"
        width="16"
        height="8"
        rx="1"
        className="fill-stone-50"
      />

      {/* Counter */}
      <rect
        x="48"
        y="120"
        width="144"
        height="6"
        rx="2"
        className="fill-amber-700"
      />
      <rect x="52" y="126" width="136" height="30" className="fill-amber-800" />
      <path
        d="M52 136h136M52 146h136"
        className="stroke-amber-900"
        strokeWidth="1.5"
      />

      {/* Cardboard waiting outside */}
      <rect
        x="24"
        y="130"
        width="34"
        height="26"
        rx="2"
        className="fill-orange-200"
      />
      <path d="M24 130h34l4-6H28Z" className="fill-orange-300" />
      <rect
        x="186"
        y="138"
        width="30"
        height="18"
        rx="2"
        className="fill-stone-50"
      />
      <path
        d="M189 144h24M189 150h24"
        className="stroke-stone-300"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path d="M201 138v18" className="stroke-amber-700" strokeWidth="2" />
    </IllustrationFrame>
  );
}

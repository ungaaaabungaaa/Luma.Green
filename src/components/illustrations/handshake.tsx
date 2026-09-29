import { IllustrationFrame, type IllustrationProps } from "./frame";

const FINGERS = [98, 107, 116, 125];

/** Two hands shaking on a deal, with a sprout growing above them. */
export function Handshake(props: IllustrationProps) {
  return (
    <IllustrationFrame {...props}>
      {/* Sprout */}
      <path
        d="M120 72V52"
        className="stroke-brand-600"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M120 56c-2-12-12-18-22-16 2 12 12 18 22 16Z"
        className="fill-brand-400"
      />
      <path
        d="M120 52c2-12 12-18 22-16-2 12-12 18-22 16Z"
        className="fill-brand-500"
      />

      {/* Left arm (green sleeve) */}
      <g transform="rotate(18 120 106)">
        <rect
          x="18"
          y="92"
          width="62"
          height="30"
          rx="6"
          className="fill-brand-600"
        />
        <rect
          x="72"
          y="90"
          width="12"
          height="34"
          rx="3"
          className="fill-brand-800"
        />
        <rect
          x="82"
          y="96"
          width="58"
          height="24"
          rx="11"
          className="fill-orange-300"
        />
      </g>

      {/* Right arm (grey sleeve), fingers wrapping over */}
      <g transform="rotate(-18 120 106)">
        <rect
          x="160"
          y="88"
          width="62"
          height="30"
          rx="6"
          className="fill-stone-500"
        />
        <rect
          x="156"
          y="86"
          width="12"
          height="34"
          rx="3"
          className="fill-stone-600"
        />
        <rect
          x="100"
          y="90"
          width="58"
          height="24"
          rx="11"
          className="fill-amber-700"
        />
        {FINGERS.map((x) => (
          <rect
            key={x}
            x={x}
            y="98"
            width="9"
            height="26"
            rx="4.5"
            className="fill-amber-700"
          />
        ))}
        <path
          d="M107 100v18M116 100v18M125 100v18"
          className="stroke-amber-800"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </g>

      {/* Left thumb over the grip */}
      <g transform="rotate(18 120 106)">
        <rect
          x="112"
          y="86"
          width="30"
          height="10"
          rx="5"
          transform="rotate(-24 112 91)"
          className="fill-orange-300"
        />
      </g>
    </IllustrationFrame>
  );
}

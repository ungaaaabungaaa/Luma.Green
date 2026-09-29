import { IllustrationFrame, type IllustrationProps } from "./frame";

const CODE_BOXES = [91, 99, 107, 115, 123, 131];
const BUBBLE_DOTS = [162, 170, 178, 186, 194, 202];

/** A phone receiving a 6-digit SMS code, with a tick for "confirmed". */
export function SmsCodePhone(props: IllustrationProps) {
  return (
    <IllustrationFrame {...props}>
      {/* Phone */}
      <rect
        x="82"
        y="28"
        width="64"
        height="124"
        rx="10"
        className="fill-stone-800"
      />
      <rect
        x="87"
        y="38"
        width="54"
        height="106"
        rx="4"
        className="fill-white"
      />
      <rect
        x="104"
        y="32"
        width="20"
        height="3"
        rx="1.5"
        className="fill-stone-600"
      />
      <rect x="87" y="38" width="54" height="14" className="fill-brand-600" />
      <circle cx="96" cy="45" r="3.5" className="fill-brand-100" />
      <rect
        x="103"
        y="43"
        width="22"
        height="4"
        rx="2"
        className="fill-brand-100"
      />

      {/* The message */}
      <rect
        x="91"
        y="60"
        width="42"
        height="24"
        rx="6"
        className="fill-brand-50"
      />
      <path
        d="M96 68h30M96 76h20"
        className="stroke-stone-300"
        strokeWidth="3"
        strokeLinecap="round"
      />

      {/* Code boxes */}
      {CODE_BOXES.map((x) => (
        <g key={x}>
          <rect
            x={x}
            y="94"
            width="6"
            height="11"
            rx="1.5"
            className="fill-brand-100"
          />
          <rect
            x={x + 2}
            y="97"
            width="2"
            height="5"
            rx="1"
            className="fill-brand-700"
          />
        </g>
      ))}
      <rect
        x="95"
        y="116"
        width="38"
        height="12"
        rx="4"
        className="fill-brand-600"
      />

      {/* SMS bubble */}
      <path
        d="M150 44h54a10 10 0 0 1 10 10v16a10 10 0 0 1-10 10h-42l-10 8v-8a10 10 0 0 1-8-10V54a10 10 0 0 1 6-10Z"
        className="fill-brand-600"
      />
      {BUBBLE_DOTS.map((cx) => (
        <circle key={cx} cx={cx} cy="62" r="3" className="fill-white" />
      ))}

      {/* Confirmed */}
      <circle cx="72" cy="120" r="15" className="fill-brand-500" />
      <path
        d="m65 120 5 5 9-10"
        className="stroke-white"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </IllustrationFrame>
  );
}

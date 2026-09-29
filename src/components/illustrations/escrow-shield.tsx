import { IllustrationFrame, type IllustrationProps } from "./frame";

function CoinStack({ x }: { x: number }) {
  const cx = x + 14;
  return (
    <g>
      <rect x={x} y="130" width="28" height="22" className="fill-amber-500" />
      <ellipse cx={cx} cy="152" rx="14" ry="5" className="fill-amber-500" />
      <path
        d={`M${String(x)} 137h28M${String(x)} 144h28`}
        className="stroke-amber-600"
        strokeWidth="1.5"
      />
      <ellipse cx={cx} cy="130" rx="14" ry="5" className="fill-amber-300" />
    </g>
  );
}

/**
 * Escrow: the buyer's money (left) waits inside a shield marked with a rupee
 * before it reaches the seller (right).
 */
export function EscrowShield(props: IllustrationProps) {
  return (
    <IllustrationFrame {...props}>
      <CoinStack x={30} />
      <CoinStack x={182} />

      {/* Money flowing in and out */}
      <path
        d="M58 112c10-14 22-18 30-16M154 96c8-2 20 2 30 16"
        className="stroke-brand-400"
        strokeWidth="4"
        strokeLinecap="round"
        fill="none"
      />
      <path d="m84 90 8 6-8 6Z" className="fill-brand-400" />
      <path d="m180 106 8 6-9 3Z" className="fill-brand-400" />

      {/* Shield with a rupee */}
      <path
        d="M120 26l46 16v34c0 34-20 58-46 68-26-10-46-34-46-68V42Z"
        className="fill-brand-700"
      />
      <path
        d="M120 36l36 12v28c0 28-16 48-36 56-20-8-36-28-36-56V48Z"
        className="fill-brand-600"
      />
      <path
        d="M104 62h32M104 73h32M104 62h14a11 11 0 0 1 0 22h-14l24 24"
        className="stroke-white"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </IllustrationFrame>
  );
}

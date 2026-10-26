import { useReducedMotion } from 'framer-motion';

// Vòng thời gian lượt: xanh → vàng → đỏ, không phụ thuộc ảnh/nền.
export default function TurnTimerRing({ seconds = null, total = 60, size = 44, className = '' }) {
  const reduceMotion = useReducedMotion();
  if (seconds === null || seconds === undefined) return null;
  const safeTotal = Math.max(1, Number(total) || 60);
  const left = Math.max(0, Math.min(safeTotal, Number(seconds) || 0));
  const radius = (size - 6) / 2;
  const circumference = 2 * Math.PI * radius;
  const ratio = left / safeTotal;
  const color = left <= 5 ? '#B9472E' : left <= 10 ? '#C9922E' : '#2F7D5A';

  return (
    <span
      className={`relative inline-flex shrink-0 items-center justify-center rounded-full border-2 border-[var(--ink)] bg-[var(--paper)] text-[var(--ink)] shadow-[1px_1px_0_var(--hard-shadow)] ${className}`}
      style={{ width: size, height: size }}
      role="timer"
      aria-label={`Còn ${left} giây`}
    >
      <svg className="absolute inset-0 -rotate-90" width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--paper-2)" strokeWidth="5" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - ratio)}
          style={reduceMotion ? undefined : { transition: 'stroke-dashoffset 500ms linear, stroke 200ms ease' }}
        />
      </svg>
      <span className="relative font-display text-[10px] font-black tabular-nums leading-none">{left}s</span>
    </span>
  );
}

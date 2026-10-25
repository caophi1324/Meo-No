import { motion } from 'framer-motion';

const SIZES = {
  small: 'w-20 sm:w-24',
  normal: 'w-24 sm:w-28',
  large: 'w-32 sm:w-40',
};

export default function CustomCard({
  card,
  selected = false,
  highlighted = false,
  onClick,
  size = 'normal',
  className = '',
}) {
  const interactive = !!onClick;

  return (
    <motion.div
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : -1}
      aria-label={`${card.name}${selected ? ', đang chọn' : highlighted ? ', có thể dùng' : ''}`}
      aria-pressed={interactive ? selected : undefined}
      onClick={onClick}
      onKeyDown={(event) => {
        if (!interactive) return;
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onClick();
        }
      }}
      whileHover={interactive ? { y: -4 } : undefined}
      whileTap={interactive ? { scale: 0.97 } : undefined}
      className={`relative aspect-[5/7] shrink-0 overflow-hidden rounded-[4px] border-2 bg-[var(--paper-2)] shadow-[3px_3px_0_var(--hard-shadow)] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mustard)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--paper)] ${SIZES[size] || SIZES.normal} ${
        selected
          ? 'border-[var(--oxblood)] ring-2 ring-[var(--mustard)] ring-offset-2 ring-offset-[var(--paper)]'
          : highlighted
            ? 'border-[var(--oxblood)] nope-glow'
            : 'border-[var(--ink)]'
      } ${interactive ? 'cursor-pointer' : ''} ${className}`}
    >
      <img
        src={card.image}
        alt={card.name}
        className="h-full w-full rounded-[2px] object-cover"
        loading="lazy"
      />
      {selected && (
        <div className="absolute right-1 top-1 rounded-[2px] border-2 border-[var(--ink)] bg-[var(--mustard)] px-1.5 py-0.5 text-[9px] font-black text-[var(--ink)] shadow-[1px_1px_0_var(--hard-shadow)]">
          ✓
        </div>
      )}
      {highlighted && (
        <div className="absolute left-1/2 top-1 -translate-x-1/2 rounded-[2px] border-2 border-[var(--ink)] bg-[var(--oxblood)] px-2 py-0.5 text-[9px] font-black tracking-wider text-[var(--paper)] shadow-[1px_1px_0_var(--hard-shadow)]">
          NOPE!
        </div>
      )}
    </motion.div>
  );
}

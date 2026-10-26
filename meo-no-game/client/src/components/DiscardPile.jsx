import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import Card from './Card';
import AnimatedCount from './AnimatedCount';
import useGameStore from '../store/gameStore';

function offset(id) {
  let hash = 0;
  for (const char of String(id)) hash = (hash * 31 + char.charCodeAt(0)) | 0;
  const n = Math.abs(hash);
  return { x: n % 9 - 4, y: Math.floor(n / 9) % 9 - 4, rotate: Math.floor(n / 81) % 11 - 5 };
}

export default function DiscardPile({ cards = [] }) {
  const active = useGameStore(s => s.cardEffect);
  const queue = useGameStore(s => s.effectQueue);
  const reduceMotion = useReducedMotion();
  const hidden = new Set([active, ...queue].filter(e => e?.flight && e.phase === 'flight').flatMap(e => (e.cards || []).map(c => c.id)));
  const visible = cards.filter(c => !hidden.has(c.id));
  return <div className="flex flex-col items-center gap-2">
    <div data-discard-pile className="relative w-24 h-34 sm:w-28 sm:h-40 flex items-center justify-center select-none">
      <div className="absolute -bottom-2 w-24 h-5 bg-[var(--hard-shadow)]/60 rounded-full blur-md pointer-events-none"/>
      {!visible.length && <div className="w-full h-full rounded-[6px] border-2 border-dashed border-[var(--paper)]/40 bg-[var(--felt-dark)]/50 flex items-center justify-center text-[var(--paper)]/70 p-2 text-center"><span className="text-[11px] font-bold">CHỒNG BÀI HẠ</span></div>}
      <AnimatePresence initial={false}>
        {visible.slice(-4).map((card, i) => <motion.div key={card.id} className="absolute inset-0" style={{ zIndex: i }}
          initial={{ opacity: 0 }} animate={{ opacity: 1, ...(reduceMotion ? {} : offset(card.id)) }} exit={{ opacity: 0 }} transition={{ duration: .15 }}>
          <Card card={card} size="small" layoutScope="discard" className="w-full h-full"/>
        </motion.div>)}
      </AnimatePresence>
    </div>
    <div className="rounded-[4px] border-2 border-[var(--ink)] bg-[var(--paper)] px-3 py-1 text-[var(--ink)] shadow-[2px_2px_0_var(--hard-shadow)]">
      <span className="text-xs font-bold font-display"><AnimatedCount value={cards.length}/> <span className="text-[var(--ink-soft)] font-normal text-[10px]">lá đã đánh</span></span>
    </div>
  </div>;
}

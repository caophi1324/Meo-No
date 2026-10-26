import { useEffect, useRef } from 'react';
import { animate, motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { soundEffects } from '../utils/soundEffects';

// Hiệu ứng riêng cho từng loại lá bài — chạy cho CẢ người đánh lẫn người xem.
export const FINISHER_META = {
  default: {
    label: 'MÈO NỔ!',
    emoji: '💥',
    color: '#7B2D26',
    accent: '#C9922E',
    confetti: ['#C9922E', '#7B2D26', '#1F4D3A', '#A9743F', '#F4EAD5'],
  },
  anime: {
    label: 'NHÁT CHÉM CUỐI',
    emoji: '⚔️',
    color: '#B23A48',
    accent: '#F2C14E',
    confetti: ['#E8A0B4', '#F2C14E', '#F4EAD5', '#B23A48'],
  },
  lol: {
    label: 'HEXTECH OVERFLOW',
    emoji: '⚡',
    color: '#C9922E',
    accent: '#2A9D8F',
    confetti: ['#F2D28A', '#2A9D8F', '#F4EAD5', '#123640'],
  },
};

export const EFFECT_META = {
  attack: { label: 'TẤN CÔNG', emoji: '⚔️', color: '#FB923C', sound: 'playAttack' },
  skip: { label: 'BỎ LƯỢT', emoji: '⏭️', color: '#38BDF8', sound: 'playSkip' },
  favor_request: { label: 'XIN BÀI', emoji: '🙏', color: '#FBBF24', sound: 'playFavor' },
  favor_give: { label: 'NHẬN BÀI', emoji: '🎁', color: '#FBBF24', sound: 'playCard' },
  shuffle: { label: 'XÁO TRỘN', emoji: '🔀', color: '#34D399', sound: 'playShuffle' },
  see_the_future: { label: 'NHÌN TƯƠNG LAI', emoji: '🔮', color: '#C084FC', sound: 'playFuture' },
  reverse: { label: 'ĐẢO CHIỀU', emoji: '🔄', color: '#22D3EE', sound: 'playReverse' },
  reverse_alt: { label: 'HOÁN ĐỔI', emoji: '🔁', color: '#22D3EE', sound: 'playReverse' },
  steal_card: { label: 'TRỘM BÀI', emoji: '🐧', color: '#34D399', sound: 'playCat' },
  boom_atomic: { label: 'BOOM NGUYÊN TỬ', emoji: '☢️', color: '#F59E0B', sound: 'playShuffle' },
  imploding_flipped: { label: 'IMPLODING KITTEN', emoji: '💣', color: '#38BDF8', sound: 'playImplodingFlip' },
  super_skip: { label: 'SIÊU BỎ LƯỢT', emoji: '⏩', color: '#60A5FA', sound: 'playSkip' },
  alter_future: { label: 'KIẾN TẠO TƯƠNG LAI', emoji: '🌌', color: '#A78BFA', sound: 'playFuture' },
  fuel: { label: 'NẠP NHIÊN LIỆU', emoji: '⛽', color: '#F59E0B', sound: 'playFuel' },
  super_destroy: { label: 'SIÊU HỦY BÀI', emoji: '🧨', color: '#F43F5E', sound: 'playDestroy' },
  steal_random: { label: 'CƯỚP BÀI', emoji: '🐱', color: '#F472B6', sound: 'playCat' },
  steal_specific: { label: 'ĐÒI BÀI', emoji: '🐱', color: '#F472B6', sound: 'playCat' },
  steal_discard: { label: 'LẤY BÀI HẠ', emoji: '🐱', color: '#F472B6', sound: 'playBeast' },
  reaction_steal: { label: 'PHẢN ĐÒN', emoji: '🛡️', color: '#F472B6', sound: 'playBeast' },
  action_cancelled: { label: 'BỊ PHỦ NHẬN', emoji: '🚫', color: '#EF4444', sound: 'playNopeSlam' },
  exploded: { label: 'NỔ TUNG', emoji: '💥', color: '#EF4444', sound: 'playExplosion' },
};

function nameOf(players, id) {
  if (!id) return '';
  return players.find((p) => p.id === id)?.name || 'Ai đó';
}

function subtitleFor(effect, players) {
  const owner = nameOf(players, effect.playerId || effect.requester);
  const target = nameOf(players, effect.targetPlayerId || effect.target || effect.to);

  switch (effect.type) {
    case 'attack':
      return target
        ? `${owner} ⚔️ ${target}${effect.turnsRemaining > 2 ? ` ×${effect.turnsRemaining}` : ''}`
        : owner;
    case 'favor_request':
      return target ? `${owner} 🙏 ${target}` : owner;
    case 'super_destroy':
      return target
        ? `${owner} 🧨 ${target}${effect.destroyed === false ? ' (trượt)' : ''}`
        : owner;
    case 'favor_give':
      return `${nameOf(players, effect.from)} 🎁 ${nameOf(players, effect.to)}`;
    case 'steal_random':
    case 'steal_specific':
    case 'steal_discard': {
      const thief = nameOf(players, effect.to);
      const victim = nameOf(players, effect.from);
      return victim ? `${thief} cướp từ ${victim}` : thief;
    }
    case 'action_cancelled':
      return `${owner} vừa bị chặn`;
    case 'reaction_steal':
      return effect.blocked
        ? `${owner} bị chặn phản đòn`
        : `${owner} 🛡️ ${target} (${effect.stolen || 0} lá)`;
    default:
      return owner;
  }
}

export default function CardEffectOverlay({ effect, players = [], onDone, managedAudio = false }) {
  const meta = effect ? EFFECT_META[effect.type] : null;
  const reduceMotion = useReducedMotion();
  const done = useRef(onDone); done.current = onDone;

  useEffect(() => {
    if (!effect) return;
    let cancelled = false, timeline, audio;
    const frame = requestAnimationFrame(() => {
      if (!meta) { done.current?.(); return; }
      audio = !managedAudio ? soundEffects.playTracked(meta.sound) : null;
      timeline = animate(0, 1, { duration: 1.25, onComplete: async () => {
        await audio?.done;
        if (!cancelled) done.current?.();
      } });
    });
    return () => { cancelled = true; cancelAnimationFrame(frame); timeline?.stop(); audio?.cancel(); };
  }, [effect?.effectId, managedAudio]);

  if (reduceMotion) {
    if (!effect || !meta) return null;
    return (
      <div className="fixed inset-0 z-40 pointer-events-none flex items-center justify-center" aria-hidden="true">
        <div className="paper-panel relative z-10 w-full max-w-md overflow-hidden">
          <div className="h-2 w-full" style={{ backgroundColor: meta.color }} />
          <div className="flex flex-col items-center gap-1 px-6 py-4">
            <div className="text-4xl sm:text-5xl filter drop-shadow">{meta.emoji}</div>
            <div className="font-display text-lg sm:text-2xl font-black tracking-wider text-[var(--ink)]">
              {meta.label}
            </div>
            <div className="text-xs sm:text-sm font-bold text-[var(--ink-soft)]">
              {subtitleFor(effect, players)}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <AnimatePresence>
      {effect && meta && (
        <motion.div
          key={effect.effectId}
          className="fixed inset-0 z-40 pointer-events-none flex items-center justify-center overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          aria-hidden="true"
        >
          <motion.div
            className="absolute inset-0"
            style={{ background: `radial-gradient(circle at 50% 45%, ${meta.color}1f 0%, transparent 62%)` }}
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.8, 0.4, 0] }}
            transition={{ duration: 1.2 }}
          />

          <motion.div
            className="paper-panel relative z-10 w-full max-w-md overflow-hidden"
            initial={{ opacity: 0, scale: 0.88, y: 18 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 1.06, y: -12 }}
            transition={{ type: 'spring', stiffness: 300, damping: 22 }}
          >
            <div className="h-2 w-full" style={{ backgroundColor: meta.color }} />
            <div className="flex flex-col items-center gap-1 px-6 py-4">
              <div className="text-4xl sm:text-5xl filter drop-shadow">{meta.emoji}</div>
              <div className="font-display text-lg sm:text-2xl font-black tracking-wider text-[var(--ink)]">
                {meta.label}
              </div>
              <div className="text-xs sm:text-sm font-bold text-[var(--ink-soft)]">
                {subtitleFor(effect, players)}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

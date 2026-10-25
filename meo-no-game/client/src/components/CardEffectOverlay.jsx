import { useEffect } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { soundEffects } from '../utils/soundEffects';
import useGameStore from '../store/gameStore';
import { themedImage } from '../../../shared/decks.js';

// Hiệu ứng riêng cho từng loại lá bài — chạy cho CẢ người đánh lẫn người xem.
const EFFECT_META = {
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
  imploding_flipped: { label: 'IMPLODING KITTEN', emoji: '💣', color: '#38BDF8', sound: null },
  super_skip: { label: 'SIÊU BỎ LƯỢT', emoji: '⏩', color: '#60A5FA', sound: 'playSkip' },
  alter_future: { label: 'KIẾN TẠO TƯƠNG LAI', emoji: '🌌', color: '#A78BFA', sound: 'playFuture' },
  fuel: { label: 'NẠP NHIÊN LIỆU', emoji: '⛽', color: '#F59E0B', sound: 'playFuel' },
  super_destroy: { label: 'SIÊU HỦY BÀI', emoji: '🧨', color: '#F43F5E', sound: 'playDestroy' },
  steal_random: { label: 'CƯỚP BÀI', emoji: '🐱', color: '#F472B6', sound: 'playCat' },
  steal_specific: { label: 'ĐÒI BÀI', emoji: '🐱', color: '#F472B6', sound: 'playCat' },
  steal_discard: { label: 'LẤY BÀI HẠ', emoji: '🐱', color: '#F472B6', sound: 'playBeast' },
  reaction_steal: { label: 'PHẢN ĐÒN', emoji: '🛡️', color: '#F472B6', sound: 'playBeast' },
  action_cancelled: { label: 'BỊ PHỦ NHẬN', emoji: '🚫', color: '#EF4444', sound: 'playNopeSlam' },
  exploded: { label: 'NỔ TUNG', emoji: '💥', color: '#EF4444', sound: null },
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

function Decor({ type, color }) {
  const deckTheme = useGameStore((s) => s.deckTheme);

  if (type === 'attack') {
    return (
      <div className="absolute inset-0 overflow-hidden">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="absolute left-0 top-1/2 h-1.5 w-[120%] origin-center"
            style={{
              background: `linear-gradient(90deg, transparent, ${color}, transparent)`,
              rotate: `${-24 + i * 20}deg`,
              y: `${(i - 1) * 46}px`,
            }}
            initial={{ x: '-110%', opacity: 0 }}
            animate={{ x: '110%', opacity: [0, 1, 0] }}
            transition={{ duration: 0.55, delay: i * 0.06, ease: 'easeOut' }}
          />
        ))}
      </div>
    );
  }

  if (type === 'skip' || type === 'super_skip') {
    return (
      <div className="absolute inset-0 overflow-hidden">
        {[0, 1, 2, 3].map((i) => (
          <motion.div
            key={i}
            className="absolute left-0 h-0.5 w-[100%]"
            style={{ top: `${35 + i * 9}%`, background: `linear-gradient(90deg, transparent, ${color}, transparent)` }}
            initial={{ x: '-100%', opacity: 0 }}
            animate={{ x: '100%', opacity: [0, 1, 0] }}
            transition={{ duration: 0.4, delay: i * 0.05, ease: 'easeInOut' }}
          />
        ))}
      </div>
    );
  }

  if (type === 'favor_request' || type === 'favor_give') {
    return (
      <div className="absolute inset-0 overflow-hidden">
        {[0, 1, 2, 3, 4].map((i) => (
          <motion.div
            key={i}
            className="absolute text-2xl"
            style={{ left: `${42 + (i - 2) * 7}%`, top: '58%' }}
            initial={{ opacity: 0, y: 30, scale: 0.6 }}
            animate={{ opacity: [0, 1, 0], y: -90 - i * 14, scale: 1 }}
            transition={{ duration: 1, delay: i * 0.08, ease: 'easeOut' }}
          >
            💛
          </motion.div>
        ))}
      </div>
    );
  }

  if (type === 'shuffle') {
    return (
      <div className="absolute inset-0 flex items-center justify-center">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="absolute rounded-full border-2 border-dashed"
            style={{
              width: `${120 + i * 55}px`,
              height: `${120 + i * 55}px`,
              borderColor: `${color}88`,
            }}
            animate={{ rotate: i % 2 === 0 ? 360 : -360 }}
            transition={{ duration: 1.4 + i * 0.4, repeat: Infinity, ease: 'linear' }}
          />
        ))}
      </div>
    );
  }

  if (type === 'see_the_future' || type === 'alter_future') {
    return (
      <div className="absolute inset-0 flex items-center justify-center">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="absolute rounded-full border"
            style={{ width: `${130 + i * 60}px`, height: `${130 + i * 60}px`, borderColor: `${color}66` }}
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: [0.6, 1.1, 1.4], opacity: [0, 0.8, 0] }}
            transition={{ duration: 1.1, delay: i * 0.12, ease: 'easeOut' }}
          />
        ))}
      </div>
    );
  }

  if (type === 'steal_random' || type === 'steal_specific' || type === 'steal_discard') {
    return (
      <div className="absolute inset-0 overflow-hidden">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="absolute left-1/2 top-1/2 h-1 w-[55vw] rounded-full"
            style={{
              background: `linear-gradient(90deg, transparent, ${color}, transparent)`,
              rotate: `${-32 + i * 32}deg`,
            }}
            initial={{ scaleX: 0, opacity: 0 }}
            animate={{ scaleX: [0, 1, 1], opacity: [0, 1, 0] }}
            transition={{ duration: 0.5, delay: i * 0.05 }}
          />
        ))}
      </div>
    );
  }

  if (type === 'reverse') {
    return (
      <div className="absolute inset-0 flex items-center justify-center">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="absolute text-5xl sm:text-7xl"
            style={{ color, opacity: 0.35 }}
            initial={{ scale: 0.5, rotate: 0, opacity: 0 }}
            animate={{ scale: [0.5, 1.2, 1.6], rotate: i % 2 === 0 ? -360 : 360, opacity: [0, 0.7, 0] }}
            transition={{ duration: 1.1, delay: i * 0.1, ease: 'easeOut' }}
          >
            {i % 2 === 0 ? '↻' : '↺'}
          </motion.div>
        ))}
      </div>
    );
  }

  if (type === 'fuel') {
    return (
      <div className="absolute inset-0 overflow-hidden">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <motion.div
            key={i}
            className="absolute text-xl sm:text-2xl"
            style={{ left: `${38 + i * 5}%`, top: '62%' }}
            initial={{ opacity: 0, y: 20, scale: 0.5 }}
            animate={{ opacity: [0, 1, 0], y: -120 - i * 12, scale: 1.2 }}
            transition={{ duration: 0.9, delay: i * 0.06, ease: 'easeOut' }}
          >
            🔥
          </motion.div>
        ))}
      </div>
    );
  }

  if (type === 'super_destroy') {
    return (
      <div className="absolute inset-0 overflow-hidden">
        {[0, 1, 2, 3, 4, 5, 6].map((i) => (
          <motion.div
            key={i}
            className="absolute left-1/2 top-1/2 h-1.5 w-16 rounded-sm"
            style={{ background: color, rotate: `${i * 28}deg` }}
            initial={{ opacity: 0, scaleX: 0 }}
            animate={{ opacity: [0, 1, 0], scaleX: [0, 1.4, 0.4], x: [0, (i - 3) * 34, (i - 3) * 70] }}
            transition={{ duration: 0.7, delay: i * 0.03, ease: 'easeOut' }}
          />
        ))}
      </div>
    );
  }

  if (type === 'exploded' || type === 'boom_atomic') {
    return (
      <div className="absolute inset-0 flex items-center justify-center">
        {[0, 1].map((i) => (
          <motion.div
            key={`boom-ring-${i}`}
            className="absolute rounded-full border-2"
            style={{ width: 110, height: 110, borderColor: `${color}aa` }}
            initial={{ scale: 0.45, opacity: 0 }}
            animate={{ scale: [0.45, 1.6, 2.2], opacity: [0, 0.8, 0] }}
            transition={{ duration: 0.55, delay: i * 0.18, ease: 'easeOut' }}
          />
        ))}
        {Array.from({ length: 8 }).map((_, i) => (
          <motion.div
            key={`boom-bit-${i}`}
            className="absolute h-1.5 w-1.5 rounded-full"
            style={{ background: color }}
            initial={{ opacity: 0, x: 0, y: 0 }}
            animate={{
              opacity: [0, 1, 0],
              x: Math.cos((i * Math.PI) / 4) * 92,
              y: Math.sin((i * Math.PI) / 4) * 92,
            }}
            transition={{ duration: 0.5, delay: 0.36, ease: 'easeOut' }}
          />
        ))}
      </div>
    );
  }

  if (type === 'action_cancelled') {
    return (
      <div className="absolute inset-0 flex items-center justify-center">
        <motion.img
          src={themedImage('/cards/custom/MN012.jpg', deckTheme)}
          alt=""
          className="absolute w-24 h-36 rounded-xl border-2 object-cover shadow-2xl"
          style={{ borderColor: color }}
          initial={{ y: -180, rotate: -16, scale: 1.3, opacity: 0 }}
          animate={{ y: 20, rotate: -8, scale: 1, opacity: 1 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
        />
        <motion.div
          className="absolute flex items-center justify-center"
          initial={{ scale: 2.4, opacity: 0, rotate: -18 }}
          animate={{ scale: 1, opacity: 1, rotate: -12 }}
          exit={{ scale: 1.2, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 320, damping: 18, delay: 0.24 }}
        >
          <div
            className="px-10 py-4 rounded-2xl border-4 text-5xl sm:text-6xl font-black tracking-widest font-display"
            style={{ borderColor: color, color, boxShadow: `0 0 60px ${color}88`, background: 'rgba(15,23,42,0.75)' }}
          >
            NOPE!
          </div>
        </motion.div>
      </div>
    );
  }

  return null;
}

export default function CardEffectOverlay({ effect, players = [], onDone }) {
  const meta = effect ? EFFECT_META[effect.type] : null;
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (!effect || !meta) return;
    const play = meta.sound ? soundEffects[meta.sound] : null;
    if (typeof play === 'function') play.call(soundEffects);
    const timer = setTimeout(() => onDone && onDone(), 1250);
    return () => clearTimeout(timer);
  }, [effect?.effectId]);

  if (reduceMotion) {
    if (!effect || !meta) return null;
    return (
      <div className="fixed inset-0 z-40 pointer-events-none flex items-center justify-center" aria-hidden="true">
        <div
          className="relative z-10 flex flex-col items-center gap-1 px-6 py-4 rounded-3xl border-2 bg-slate-950/85 backdrop-blur-sm shadow-2xl"
          style={{ borderColor: meta.color, boxShadow: `0 0 50px ${meta.color}66` }}
        >
          <div className="text-4xl sm:text-5xl filter drop-shadow">{meta.emoji}</div>
          <div className="font-black text-lg sm:text-2xl font-display tracking-wider" style={{ color: meta.color }}>
            {meta.label}
          </div>
          <div className="text-xs sm:text-sm font-bold text-slate-200">
            {subtitleFor(effect, players)}
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
            style={{ background: `radial-gradient(circle at 50% 45%, ${meta.color}33 0%, transparent 60%)` }}
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.9, 0.5, 0] }}
            transition={{ duration: 1.2 }}
          />

          <motion.div
            className="absolute w-40 h-40 rounded-full border-4"
            style={{ borderColor: meta.color }}
            initial={{ scale: 0.3, opacity: 0.9 }}
            animate={{ scale: 2.8, opacity: 0 }}
            transition={{ duration: 0.9, ease: 'easeOut' }}
          />

          <Decor type={effect.type} color={meta.color} />

          <motion.div
            className="relative z-10 flex flex-col items-center gap-1 px-6 py-4 rounded-3xl border-2 bg-slate-950/85 backdrop-blur-sm shadow-2xl"
            style={{ borderColor: meta.color, boxShadow: `0 0 50px ${meta.color}66` }}
            initial={{ opacity: 0, scale: 0.6, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 1.15, y: -20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          >
            <div className="text-4xl sm:text-5xl filter drop-shadow">{meta.emoji}</div>
            <div className="font-black text-lg sm:text-2xl font-display tracking-wider" style={{ color: meta.color }}>
              {meta.label}
            </div>
            <div className="text-xs sm:text-sm font-bold text-slate-200">
              {subtitleFor(effect, players)}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

import { useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { useReducedMotion } from 'framer-motion';
import ModalShell from './ModalShell';
import { FINISHER_META } from './CardEffectOverlay';
import { finisherFor } from '../../../shared/decks.js';
import { soundEffects } from '../utils/soundEffects';

// Nền tĩnh theo theme, giữ nguyên khi bật reduced motion.
const BACKDROPS = {
  default: {
    className: 'from-[#F4EAD5] via-[#E5D3B2] to-[#C9922E]/40',
    glyphs: ['💥', '🧨'],
  },
  anime: {
    className: 'from-[#211A31] via-[#3A2748] to-[#B23A48]/50',
    glyphs: ['🌸', '⚔️'],
  },
  lol: {
    className: 'from-[#081820] via-[#123640] to-[#2A9D8F]/50',
    glyphs: ['⚡', '🔷'],
  },
};

export default function GameOverModal({
  winnerName,
  winnerId,
  playerId,
  stats,
  deckTheme = 'default',
  onPlayAgain,
  onHome,
}) {
  const reduceMotion = useReducedMotion();
  const isWinner = !!winnerId && winnerId === playerId;
  const theme = finisherFor(deckTheme);
  const meta = FINISHER_META[theme] || FINISHER_META.default;
  const backdrop = BACKDROPS[theme] || BACKDROPS.default;
  const playedRef = useRef(false);

  useEffect(() => {
    // Một chuỗi finisher duy nhất; GamePage đã bỏ qua boom khi ván kết thúc.
    if (!playedRef.current) {
      playedRef.current = true;
      soundEffects.playFinisher(theme);
    }
    if (reduceMotion) return;

    const colors = meta.confetti;
    let raf = 0;
    const end = Date.now() + 3500;

    if (theme === 'anime') {
      // Cánh hoa rơi chậm thay vì pháo hai bên.
      confetti({
        particleCount: 90,
        angle: 270,
        spread: 140,
        startVelocity: 8,
        gravity: 0.4,
        drift: 0.6,
        ticks: 260,
        scalar: 0.75,
        origin: { x: 0.5, y: -0.1 },
        colors,
      });
      return;
    }

    const frame = () => {
      if (theme === 'lol') {
        // Xung hextech từ tâm rồi tản ra.
        confetti({
          particleCount: 5,
          spread: 360,
          startVelocity: 18,
          ticks: 120,
          scalar: 0.8,
          origin: { x: 0.5, y: 0.45 },
          colors,
        });
      } else {
        confetti({
          particleCount: 4,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors,
        });
        confetti({
          particleCount: 4,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors,
        });
      }
      if (Date.now() < end) raf = requestAnimationFrame(frame);
    };
    frame();

    return () => cancelAnimationFrame(raf);
  }, [reduceMotion, theme, meta]);

  return (
    <ModalShell
      label="Kết thúc ván"
      overlayClassName="bg-black/90 backdrop-blur-md animate-in fade-in duration-300"
      panelClassName="paper-modal relative max-w-md w-full overflow-hidden p-6 text-center sm:p-8"
    >
      {/* Nền theme tĩnh — không loop, an toàn với reduced motion */}
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b ${backdrop.className} opacity-70`}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 flex h-28 select-none items-center justify-between px-4 text-2xl opacity-40"
      >
        <span>{backdrop.glyphs[0]}</span>
        <span>{backdrop.glyphs[1]}</span>
      </div>

      <div className="relative">
        <div className="text-6xl sm:text-7xl mb-1 filter drop-shadow">{meta.emoji}</div>
        <div
          className="landing-overline mb-2"
          style={{ color: meta.color === '#C9922E' ? '#8A5A16' : meta.color }}
        >
          {meta.label}
        </div>

        <h1
          className="text-3xl sm:text-4xl font-black mb-1 font-display tracking-wider"
          style={{ color: meta.color }}
        >
          {isWinner ? 'CHIẾN THẮNG!' : 'VÁN KẾT THÚC'}
        </h1>
        <p className="text-xs sm:text-sm text-[var(--ink-soft)] mb-4">
          {isWinner ? 'Bạn là người sống sót cuối cùng!' : 'Bạn đã bị loại khỏi ván này.'}
        </p>

        <div className="paper-panel paper-panel--soft my-5 p-4">
          <div className="landing-overline mb-1">👑 NGƯỜI SỐNG SÓT CUỐI CÙNG</div>
          <div className="text-2xl sm:text-3xl font-black text-[var(--oxblood)] font-display truncate">
            {winnerName}
          </div>
        </div>

        {stats && (
          <div className="mb-5 grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-[4px] border-2 border-[var(--ink)] bg-[var(--paper-2)] px-3 py-2">
              <div className="text-lg font-black text-[var(--oxblood)]">{stats.cardsPlayed || 0}</div>
              <div className="font-semibold text-[var(--ink-soft)]">lá đã chơi</div>
            </div>
            <div className="rounded-[4px] border-2 border-[var(--ink)] bg-[var(--paper-2)] px-3 py-2">
              <div className="text-lg font-black text-[var(--felt)]">{stats.nopes || 0}</div>
              <div className="font-semibold text-[var(--ink-soft)]">lần Phủ Nhận</div>
            </div>
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={() => {
              soundEffects.playClick();
              onPlayAgain();
            }}
            className="landing-btn landing-btn--oxblood flex-1 py-3.5 text-sm sm:text-base"
          >
            🔄 CHƠI LẠI
          </button>
          <button
            onClick={() => {
              soundEffects.playClick();
              onHome();
            }}
            className="landing-btn landing-btn--paper flex-1 py-3.5 text-sm sm:text-base"
          >
            🏠 VỀ TRANG CHỦ
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

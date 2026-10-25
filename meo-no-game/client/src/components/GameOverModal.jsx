import { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { useReducedMotion } from 'framer-motion';
import ModalShell from './ModalShell';
import { soundEffects } from '../utils/soundEffects';

export default function GameOverModal({
  winnerName,
  winnerId,
  playerId,
  stats,
  onPlayAgain,
  onHome,
}) {
  const reduceMotion = useReducedMotion();
  const isWinner = !!winnerId && winnerId === playerId;

  useEffect(() => {
    soundEffects.playVictory();
    if (reduceMotion) return;

    // Pháo hoa ăn mừng rực rỡ
    const duration = 3.5 * 1000;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({
        particleCount: 4,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ['#C9922E', '#7B2D26', '#1F4D3A', '#A9743F', '#F4EAD5'],
      });
      confetti({
        particleCount: 4,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ['#C9922E', '#7B2D26', '#1F4D3A', '#A9743F', '#F4EAD5'],
      });

      if (Date.now() < end) requestAnimationFrame(frame);
    };
    frame();
  }, [reduceMotion]);

  return (
    <ModalShell
      label="Kết thúc ván"
      overlayClassName="bg-black/90 backdrop-blur-md animate-in fade-in duration-300"
      panelClassName="paper-modal max-w-md w-full p-6 text-center sm:p-8"
    >
      {/* Glow */}
      <div className="text-6xl sm:text-7xl mb-3 filter drop-shadow">
        {isWinner ? '🏆' : '💥'}
      </div>

      <h1 className="text-3xl sm:text-4xl font-black text-[var(--ink)] mb-1 font-display tracking-wider">
        {isWinner ? 'CHIẾN THẮNG!' : 'VÁN KẾT THÚC'}
      </h1>
      <p className="text-xs sm:text-sm text-[var(--ink-soft)] mb-4">
        {isWinner ? 'Bạn là người sống sót cuối cùng!' : 'Bạn đã bị loại khỏi ván này.'}
      </p>

      <div className="paper-panel paper-panel--soft my-5 p-4">
        <div className="landing-overline mb-1">
          👑 NGƯỜI SỐNG SÓT CUỐI CÙNG
        </div>
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
    </ModalShell>
  );
}

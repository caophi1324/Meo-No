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
        colors: ['#F59E0B', '#EF4444', '#10B981', '#3B82F6', '#EC4899'],
      });
      confetti({
        particleCount: 4,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ['#F59E0B', '#EF4444', '#10B981', '#3B82F6', '#EC4899'],
      });

      if (Date.now() < end) requestAnimationFrame(frame);
    };
    frame();
  }, [reduceMotion]);

  return (
    <ModalShell
      label="Kết thúc ván"
      overlayClassName="bg-black/90 backdrop-blur-md animate-in fade-in duration-300"
      panelClassName="bg-gradient-to-b from-slate-800 via-slate-900 to-slate-950 rounded-3xl p-6 sm:p-8 border-2 border-amber-400 max-w-md w-full text-center shadow-2xl shadow-amber-500/30 relative overflow-hidden"
    >
      {/* Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 bg-amber-500/20 rounded-full blur-3xl pointer-events-none" />

      <div className="text-6xl sm:text-7xl mb-3 animate-bounce motion-reduce:animate-none filter drop-shadow">
        {isWinner ? '🏆' : '💥'}
      </div>

      <h1 className="text-3xl sm:text-4xl font-black bg-gradient-to-r from-amber-300 via-yellow-400 to-orange-400 bg-clip-text text-transparent mb-1 font-display tracking-wider">
        {isWinner ? 'CHIẾN THẮNG!' : 'VÁN KẾT THÚC'}
      </h1>
      <p className="text-xs sm:text-sm text-slate-400 mb-4">
        {isWinner ? 'Bạn là người sống sót cuối cùng!' : 'Bạn đã bị loại khỏi ván này.'}
      </p>

      <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 my-5">
        <div className="text-xs uppercase tracking-widest text-slate-400 mb-1 font-bold">
          👑 NGƯỜI SỐNG SÓT CUỐI CÙNG
        </div>
        <div className="text-2xl sm:text-3xl font-black text-amber-300 font-display truncate">
          {winnerName}
        </div>
      </div>

      {stats && (
        <div className="mb-5 grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-xl border border-slate-700 bg-slate-800/70 px-3 py-2">
            <div className="text-lg font-black text-amber-300">{stats.cardsPlayed || 0}</div>
            <div className="font-semibold text-slate-400">lá đã chơi</div>
          </div>
          <div className="rounded-xl border border-slate-700 bg-slate-800/70 px-3 py-2">
            <div className="text-lg font-black text-sky-300">{stats.nopes || 0}</div>
            <div className="font-semibold text-slate-400">lần Phủ Nhận</div>
          </div>
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={() => {
            soundEffects.playClick();
            onPlayAgain();
          }}
          className="flex-1 py-3.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-white rounded-xl font-black text-sm sm:text-base font-display transition-all shadow-lg shadow-orange-500/30 cursor-pointer"
        >
          🔄 CHƠI LẠI
        </button>
        <button
          onClick={() => {
            soundEffects.playClick();
            onHome();
          }}
          className="flex-1 py-3.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-bold text-sm sm:text-base font-display transition-all border border-slate-700 cursor-pointer"
        >
          🏠 VỀ TRANG CHỦ
        </button>
      </div>
    </ModalShell>
  );
}

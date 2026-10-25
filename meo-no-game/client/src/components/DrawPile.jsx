import { motion } from 'framer-motion';
import useGameStore from '../store/gameStore';
import { themedImage } from '../../../shared/decks.js';

export default function DrawPile({ count = 0, topCard = null, onClick, disabled = false }) {
  // Danger indicator if deck has very few cards
  const isDanger = count > 0 && count <= 8;
  const deckTheme = useGameStore((s) => s.deckTheme);
  const isLol = deckTheme === 'lol';
  const topImage = isLol && topCard?.lolImage ? topCard.lolImage : topCard?.image;

  return (
    <div className="flex flex-col items-center gap-2 group">
      {/* Khối chồng bài rút với hiệu ứng 3D phân lớp */}
      <motion.div
        role={disabled ? undefined : 'button'}
        tabIndex={disabled ? undefined : 0}
        aria-label="Rút bài"
        onKeyDown={(e) => {
          if (disabled || !onClick) return;
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onClick();
          }
        }}
        whileHover={!disabled ? { scale: 1.05, y: -4 } : {}}
        whileTap={!disabled ? { scale: 0.95 } : {}}
        onClick={disabled ? undefined : onClick}
        className={`relative w-24 h-34 sm:w-28 sm:h-40 flex items-center justify-center cursor-pointer select-none transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 ${
          disabled ? 'opacity-60 cursor-not-allowed filter grayscale-30' : 'cursor-pointer'
        }`}
      >
        {/* Lớp bóng đổ chân bàn */}
        <div className="absolute -bottom-2 w-24 h-5 bg-black/60 rounded-full blur-md pointer-events-none" />

        {/* Lớp bài thứ 3 (đáy chồng) */}
        {count >= 3 && (
          <div
            className="absolute inset-0 translate-x-1.5 translate-y-2 rounded-2xl border-2 border-amber-900/60 bg-slate-900 shadow-md"
            style={{ transform: 'rotate(2deg) translate(4px, 4px)' }}
          >
            <div className="w-full h-full rounded-2xl bg-amber-950/40 border border-amber-500/20" />
          </div>
        )}

        {/* Lớp bài thứ 2 (giữa chồng) */}
        {count >= 2 && (
          <div
            className="absolute inset-0 translate-x-0.5 translate-y-1 rounded-2xl border-2 border-amber-800/80 bg-slate-800 shadow-lg"
            style={{ transform: 'rotate(-1.5deg) translate(-2px, 2px)' }}
          >
            <div className="w-full h-full rounded-2xl bg-slate-900 border border-amber-500/30" />
          </div>
        )}

        {/* Lá bài trên cùng của chồng rút */}
        <div
          className={`relative w-full h-full rounded-2xl overflow-hidden border-2 sm:border-3 transition-all duration-300 shadow-2xl ${
            topCard ? 'imploding-flip' : ''
          } ${
            !disabled
              ? 'border-amber-500 shadow-orange-500/30 group-hover:border-orange-400 group-hover:shadow-orange-500/50'
              : 'border-slate-600 shadow-black/50'
          }`}
          style={{
            boxShadow: isDanger
              ? '0 0 20px rgba(239, 68, 68, 0.6), 0 8px 24px rgba(0,0,0,0.6)'
              : '0 8px 24px rgba(0,0,0,0.6)',
          }}
        >
          {topCard ? (
            <img
              src={themedImage(topImage || '/cards/custom/MN001.jpg', deckTheme)}
              alt={topCard.nameVN || 'Imploding Kitten mặt ngửa'}
              className="w-full h-full object-cover rounded-xl"
              style={isLol ? { objectPosition: 'center 20%' } : undefined}
            />
          ) : (
            <img
              src="/cards/card-back.svg"
              alt="Chồng bài rút"
              className="w-full h-full object-cover rounded-xl"
            />
          )}

          {topCard && (
            <div className="absolute inset-0 rounded-xl border-2 border-red-400 shadow-[0_0_18px_rgba(239,68,68,0.75)] pointer-events-none">
              <span className="absolute inset-x-1 bottom-2 rounded bg-red-950/90 px-1 py-0.5 text-center text-[8px] font-black uppercase tracking-wider text-red-200">
                Mặt ngửa
              </span>
            </div>
          )}

          {/* Lớp phủ sáng bóng kính */}
          <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent pointer-events-none" />

          {/* Hiệu ứng nhấp nháy khẩn cấp nếu bài sắp hết */}
          {isDanger && (
            <div className="absolute inset-0 bg-red-600/20 animate-pulse pointer-events-none" />
          )}

          {/* Gợi ý Rút Bài khi đến lượt */}
          {!disabled && (
            <div className="absolute inset-x-2 bottom-3 py-1 bg-gradient-to-r from-orange-600 to-amber-600 rounded-lg text-white font-black text-center text-[10px] sm:text-xs shadow-lg uppercase tracking-wider border border-amber-300/60 animate-pulse">
              👉 RÚT BÀI
            </div>
          )}
        </div>
      </motion.div>

      {/* Huy hiệu đếm số lượng lá bài còn lại */}
      <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-900/90 border border-slate-700 rounded-full shadow-md backdrop-blur">
        <span className="text-xs">🂠</span>
        <span className="text-xs font-bold text-white font-display">
          {count} <span className="text-slate-400 font-normal text-[10px]">lá còn lại</span>
        </span>
        {isDanger && (
          <span className="text-xs text-red-400 font-bold animate-bounce" title="Nguy cơ cao rút phải Mèo Nổ!">
            ⚠️
          </span>
        )}
      </div>
    </div>
  );
}

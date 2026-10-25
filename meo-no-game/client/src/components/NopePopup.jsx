import { useEffect } from 'react';
import { soundEffects } from '../utils/soundEffects';

const ACTION_LABELS = {
  attack: 'Tấn Công ⚔️',
  skip: 'Bỏ Lượt ⏭️',
  favor: 'Xin Bài 🙏',
  shuffle: 'Xáo Trộn 🔀',
  see_the_future: 'Nhìn Tương Lai 🔮',
  reverse: 'Đảo Chiều 🔄',
  reverse_alt: 'Hoán Đổi 🔁',
  steal_card: 'Trộm Bài 🐧',
  boom_atomic: 'Boom Nguyên Tử ☢️',
  imploding_flipped: 'Imploding Kitten 💣',
  super_skip: 'Siêu Bỏ Lượt ⏩',
  alter_future: 'Kiến Tạo Tương Lai 🌌',
  fuel: 'Nạp Nhiên Liệu ⛽',
  super_destroy: 'Siêu Hủy Bài 🧨',
  cat_combo: 'Combo Mèo 🐱',
  defuse: 'Gỡ Bom 🔧',
};

export default function NopePopup({
  info,
  countdown = 5,
  total = 5,
  canNope = true,
  nopeCards = [],
  onNope,
  onPass,
}) {
  useEffect(() => {
    soundEffects.playNope();
  }, [info]);

  if (!info) return null;
  const pct = Math.max(0, Math.min(100, (countdown / Math.max(1, total)) * 100));
  const label = info.comboSize
    ? `Combo Mèo ${info.comboSize} lá 🐱`
    : ACTION_LABELS[info.action] || 'một hành động';

  const handleNope = () => {
    soundEffects.playCard();
    if (onNope) onNope();
  };

  const handlePass = () => {
    soundEffects.playClick();
    if (onPass) onPass();
  };

  return (
    <div
      role="alertdialog"
      aria-label="Cửa sổ Phủ Nhận"
      aria-live="assertive"
      className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[94%] max-w-lg animate-in slide-in-from-top duration-300"
    >
      <div className="bg-gradient-to-r from-red-950 via-rose-900 to-red-950 border-2 border-red-500 rounded-3xl p-4 sm:p-5 shadow-2xl shadow-red-600/40 text-center relative overflow-hidden">
        {/* Animated hazard glow */}
        <div className="absolute inset-0 bg-red-600/10 animate-pulse pointer-events-none" />

        <div className="flex items-center justify-center gap-2 mb-1.5">
          <span className="text-xl sm:text-2xl animate-bounce">🚫</span>
          <span className="text-white font-black text-base sm:text-lg uppercase tracking-wider font-display">
            CỬA SỔ PHỦ NHẬN! {info.nopeCount > 0 ? `(Đã chặn ${info.nopeCount} lần)` : ''}
          </span>
          <span className="text-xl sm:text-2xl animate-bounce">🚫</span>
        </div>

        <div className="text-red-100 text-xs sm:text-sm font-semibold mb-3">
          <span className="text-amber-300 font-bold">{info.ownerName}</span> đang sử dụng{' '}
          <span className="text-white underline decoration-amber-400 font-extrabold">{label}</span>!
        </div>

        {/* Thanh đếm ngược thời gian */}
        <div className="relative h-2.5 bg-red-950/80 rounded-full overflow-hidden mb-2 border border-red-800">
          <div
            className="h-full bg-gradient-to-r from-amber-400 to-red-500 transition-all ease-linear"
            style={{ width: `${pct}%`, transitionDuration: '1000ms' }}
          />
        </div>
        <div className="text-[11px] text-red-300/90 font-bold mb-3">
          Còn lại: <span className="text-white text-xs font-black">{countdown}s</span>
        </div>

        {/* Gợi ý lá có thể dùng trong cửa sổ này */}
        {canNope && nopeCards.length > 0 && (
          <div className="mb-3 rounded-xl border border-red-400/30 bg-red-950/50 px-2.5 py-2">
            <div className="mb-1 text-[9px] font-black uppercase tracking-wider text-red-200/80">
              Lá có thể dùng
            </div>
            <div className="flex flex-wrap justify-center gap-1.5">
              {nopeCards.map((card) => (
                <span
                  key={card.id}
                  className="rounded-lg border border-red-400/50 bg-red-900/60 px-2 py-1 text-[10px] font-black text-red-100"
                >
                  🚫 {card.nameVN || 'Phủ Nhận'}
                </span>
              ))}
            </div>
            <div className="mt-1 text-[9px] font-semibold text-red-200/70">
              Bấm “CHẶN LẠI NGAY” hoặc chọn lá bài đang phát sáng.
            </div>
          </div>
        )}
        {!canNope && (
          <div className="mb-3 text-[10px] font-bold text-red-200/60">
            Bạn không có lá Phủ Nhận nào trong tay.
          </div>
        )}

        {/* Hành động */}
        <div className="flex gap-2.5 justify-center">
          <button
            onClick={handleNope}
            disabled={!canNope}
            autoFocus={canNope}
            className={`px-6 py-2.5 rounded-xl text-xs sm:text-sm font-black font-display tracking-wide transition-all shadow-lg ${
              canNope
                ? 'bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white shadow-red-600/50 hover:scale-105 active:scale-95 cursor-pointer border border-red-300 animate-pulse'
                : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
            }`}
          >
            🚫 CHẶN LẠI NGAY!
          </button>

          <button
            onClick={handlePass}
            className="px-5 py-2.5 bg-slate-800/90 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs sm:text-sm font-bold transition-all border border-slate-700 cursor-pointer"
          >
            Bỏ qua
          </button>
        </div>
      </div>
    </div>
  );
}

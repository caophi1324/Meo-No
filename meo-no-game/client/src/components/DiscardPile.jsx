import Card from './Card';

export default function DiscardPile({ cards = [] }) {
  const topCard = cards.length > 0 ? cards[cards.length - 1] : null;
  const secondCard = cards.length > 1 ? cards[cards.length - 2] : null;

  return (
    <div className="flex flex-col items-center gap-2">
      {/* Khung chồng bài hạ */}
      <div className="relative w-24 h-34 sm:w-28 sm:h-40 flex items-center justify-center select-none">
        {/* Bóng chân bàn */}
        <div className="absolute -bottom-2 w-24 h-5 bg-black/50 rounded-full blur-md pointer-events-none" />

        {topCard ? (
          <div className="relative w-full h-full flex items-center justify-center">
            {/* Lá bài bên dưới nằm lệch góc tạo cảm giác chân thật */}
            {secondCard && (
              <div
                className="absolute inset-0 pointer-events-none opacity-60 filter blur-[0.5px]"
                style={{ transform: 'rotate(-6deg) translate(-4px, 2px)' }}
              >
                <Card card={secondCard} size="small" className="w-full h-full" disabled />
              </div>
            )}

            {/* Lá bài trên cùng của chồng bài hạ */}
            <div
              className="relative w-full h-full"
              style={{ transform: 'rotate(2deg)' }}
            >
              <Card card={topCard} size="small" className="w-full h-full" disabled />
            </div>
          </div>
        ) : (
          /* Trạng thái trống: Vùng thảm trống viền nét đứt */
          <div className="w-full h-full rounded-2xl border-2 border-dashed border-slate-700/80 bg-slate-900/40 flex flex-col items-center justify-center text-slate-500 shadow-inner backdrop-blur-xs p-2 text-center">
            <div className="text-2xl mb-1 opacity-40">🎴</div>
            <div className="text-[11px] font-bold text-slate-400">CHỒNG BÀI HẠ</div>
            <div className="text-[9px] text-slate-500">Chưa có bài</div>
          </div>
        )}
      </div>

      {/* Huy hiệu số bài đã hạ */}
      <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-900/90 border border-slate-700 rounded-full shadow-md backdrop-blur">
        <span className="text-xs">🗑️</span>
        <span className="text-xs font-bold text-slate-300 font-display">
          {cards.length} <span className="text-slate-400 font-normal text-[10px]">lá đã đánh</span>
        </span>
      </div>
    </div>
  );
}

import Card from './Card';

export default function DiscardPile({ cards = [] }) {
  const topCard = cards.length > 0 ? cards[cards.length - 1] : null;
  const secondCard = cards.length > 1 ? cards[cards.length - 2] : null;

  return (
    <div className="flex flex-col items-center gap-2">
      {/* Khung chồng bài hạ */}
      <div className="relative w-24 h-34 sm:w-28 sm:h-40 flex items-center justify-center select-none">
        {/* Bóng chân bàn */}
        <div className="absolute -bottom-2 w-24 h-5 bg-[var(--hard-shadow)]/60 rounded-full blur-md pointer-events-none" />

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
          <div className="w-full h-full rounded-[6px] border-2 border-dashed border-[var(--paper)]/40 bg-[var(--felt-dark)]/50 flex flex-col items-center justify-center text-[var(--paper)]/70 p-2 text-center">
          <span className="text-[11px] font-bold">CHỒNG BÀI HẠ</span>
          </div>
        )}
      </div>

      {/* Huy hiệu số bài đã hạ */}
      <div className="flex items-center gap-1.5 rounded-[4px] border-2 border-[var(--ink)] bg-[var(--paper)] px-3 py-1 text-[var(--ink)] shadow-[2px_2px_0_var(--hard-shadow)]">
        <span className="text-xs font-bold font-display">
          {cards.length} <span className="text-[var(--ink-soft)] font-normal text-[10px]">lá đã đánh</span>
        </span>
      </div>
    </div>
  );
}

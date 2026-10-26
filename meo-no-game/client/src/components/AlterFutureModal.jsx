import { useEffect, useState } from 'react';
import ModalShell from './ModalShell';
import Card from './Card';
import { soundEffects } from '../utils/soundEffects';

export default function AlterFutureModal({ cards = [], onSubmit }) {
  const [order, setOrder] = useState(cards);

  useEffect(() => {
    setOrder(cards);
  }, [cards.map((c) => c.id).join(',')]);

  const move = (index, dir) => {
    const next = [...order];
    const to = index + dir;
    if (to < 0 || to >= next.length) return;
    [next[index], next[to]] = [next[to], next[index]];
    soundEffects.playClick();
    setOrder(next);
  };

  const handleSubmit = () => {
    soundEffects.playCard();
    if (onSubmit) onSubmit(order.map((c) => c.id));
  };

  return (
    <ModalShell
      label="Kiến tạo tương lai"
      overlayClassName="bg-black/85 backdrop-blur-sm"
      panelClassName="paper-modal max-w-xl w-full p-6 text-center sm:p-7"
    >
        <div className="text-4xl mb-1">🌌</div>
        <h2 className="text-xl sm:text-2xl font-black text-[var(--ink)] mb-1 font-display tracking-wide">
          KIẾN TẠO TƯƠNG LAI
        </h2>
        <p className="text-xs sm:text-sm text-[var(--ink-soft)] mb-5">
          Dùng nút ← → để đổi thứ tự. Lá đầu tiên sẽ nằm trên cùng chồng bài!
        </p>

        <div className="flex justify-center items-end gap-3 sm:gap-4 mb-6 overflow-x-auto pb-2">
          {order.map((card, i) => (
            <div key={card.id} className="flex flex-col items-center">
              <div
                className={`text-[10px] sm:text-xs font-bold mb-1.5 px-2 py-0.5 rounded-[3px] border-2 ${
                  i === 0
                    ? 'bg-[#F3D8D2] border-[var(--oxblood)] text-[var(--oxblood)]'
                    : 'bg-[var(--paper-2)] border-[var(--line)] text-[var(--ink-soft)]'
                }`}
              >
                {i === 0 ? '1. Trên cùng' : `Thứ ${i + 1}`}
              </div>
              <Card card={card} size="small" className="shadow-lg" />
              <div className="flex gap-1.5 mt-2">
                <button
                  onClick={() => move(i, -1)}
                  disabled={i === 0}
                  className="h-7 w-7 rounded-[3px] border-2 border-[var(--ink)] bg-[var(--paper)] text-[var(--ink)] font-bold shadow-[1px_1px_0_var(--hard-shadow)] disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[var(--paper-2)] cursor-pointer"
                  title="Đưa lên trước"
                >
                  ←
                </button>
                <button
                  onClick={() => move(i, 1)}
                  disabled={i === order.length - 1}
                  className="h-7 w-7 rounded-[3px] border-2 border-[var(--ink)] bg-[var(--paper)] text-[var(--ink)] font-bold shadow-[1px_1px_0_var(--hard-shadow)] disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[var(--paper-2)] cursor-pointer"
                  title="Đưa ra sau"
                >
                  →
                </button>
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={handleSubmit}
          className="landing-btn landing-btn--oxblood px-8 py-3 text-sm"
        >
          🌌 CHỐT THỨ TỰ & QUAY LẠI BÀN
        </button>
    </ModalShell>
  );
}

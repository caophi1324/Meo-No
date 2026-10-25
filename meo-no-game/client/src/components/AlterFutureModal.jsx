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
      panelClassName="bg-gradient-to-b from-indigo-950/95 via-slate-900 to-slate-950 rounded-3xl p-6 sm:p-7 border-2 border-violet-500 max-w-xl w-full text-center shadow-2xl shadow-violet-600/30 relative overflow-hidden"
    >
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-24 bg-violet-600/20 rounded-full blur-2xl pointer-events-none" />

        <div className="text-4xl mb-1">🌌</div>
        <h2 className="text-xl sm:text-2xl font-black text-white mb-1 font-display tracking-wide">
          KIẾN TẠO TƯƠNG LAI
        </h2>
        <p className="text-xs sm:text-sm text-violet-300/80 mb-5">
          Dùng nút ← → để đổi thứ tự. Lá đầu tiên sẽ nằm trên cùng chồng bài!
        </p>

        <div className="flex justify-center items-end gap-3 sm:gap-4 mb-6 overflow-x-auto pb-2">
          {order.map((card, i) => (
            <div key={card.id} className="flex flex-col items-center">
              <div
                className={`text-[10px] sm:text-xs font-bold mb-1.5 px-2 py-0.5 rounded-full border ${
                  i === 0
                    ? 'bg-red-950/80 border-red-500/80 text-red-300'
                    : 'bg-slate-800/80 border-slate-700 text-slate-300'
                }`}
              >
                {i === 0 ? '1. Trên cùng' : `Thứ ${i + 1}`}
              </div>
              <Card card={card} size="small" disabled className="shadow-lg" />
              <div className="flex gap-1.5 mt-2">
                <button
                  onClick={() => move(i, -1)}
                  disabled={i === 0}
                  className="w-7 h-7 rounded-lg bg-slate-800 border border-slate-600 text-slate-200 font-bold disabled:opacity-30 disabled:cursor-not-allowed hover:bg-violet-600/40 cursor-pointer"
                  title="Đưa lên trước"
                >
                  ←
                </button>
                <button
                  onClick={() => move(i, 1)}
                  disabled={i === order.length - 1}
                  className="w-7 h-7 rounded-lg bg-slate-800 border border-slate-600 text-slate-200 font-bold disabled:opacity-30 disabled:cursor-not-allowed hover:bg-violet-600/40 cursor-pointer"
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
          className="px-8 py-3 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white rounded-xl font-black text-sm font-display transition-all shadow-lg shadow-violet-600/30 cursor-pointer"
        >
          🌌 CHỐT THỨ TỰ & QUAY LẠI BÀN
        </button>
    </ModalShell>
  );
}

import { useEffect } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import ModalShell from './ModalShell';
import Card from './Card';
import { soundEffects } from '../utils/soundEffects';

export default function SeeTheFutureModal({ cards = [], onClose }) {
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const timer = setTimeout(onClose, 10000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const labels = ['1. Trên cùng (Lá kế tiếp)', '2. Tiếp theo', '3. Thứ ba'];

  return (
    <ModalShell
      label="Nhìn trước tương lai"
      onClose={onClose}
      overlayClassName="bg-black/85 backdrop-blur-sm animate-in fade-in duration-200"
      panelClassName="bg-gradient-to-b from-purple-950/90 via-slate-900 to-slate-950 rounded-3xl p-6 sm:p-7 border-2 border-purple-500 max-w-lg w-full text-center shadow-2xl shadow-purple-600/30 relative overflow-hidden"
    >
        {/* Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-24 bg-purple-600/20 rounded-full blur-2xl pointer-events-none" />

        <div className="w-14 h-14 mx-auto mb-2 rounded-2xl bg-purple-500/10 border-2 border-purple-400 flex items-center justify-center shadow-lg">
          <img src="/cards/see-the-future.svg" alt="Nhìn tương lai" className="w-10 h-10 object-contain" />
        </div>

        <h2 className="text-xl sm:text-2xl font-black text-white mb-1 font-display tracking-wide">
          🔮 NHÌN TRƯỚC TƯƠNG LAI
        </h2>
        <p className="text-xs sm:text-sm text-purple-300/80 mb-5">
          3 lá trên cùng của chồng bài rút — chỉ một mình bạn nhìn thấy!
        </p>

        {/* Danh sách 3 lá bài tương lai */}
        <div className="relative mb-6">
          <div className="pointer-events-none absolute left-1/2 top-1/2 h-44 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-purple-600/25 blur-3xl" />
          <div className="relative flex justify-center items-end gap-3 sm:gap-4 overflow-x-auto pb-2">
            {cards.map((card, i) => (
              <div key={card.id || i} className="flex flex-col items-center">
                <div
                  className={`text-[10px] sm:text-xs font-bold mb-1.5 px-2 py-0.5 rounded-full border ${
                    i === 0
                      ? 'bg-red-950/80 border-red-500/80 text-red-300'
                      : 'bg-slate-800/80 border-slate-700 text-slate-300'
                  }`}
                >
                  {labels[i] || `Thứ ${i + 1}`}
                </div>
                <motion.div
                  initial={reduceMotion ? false : { rotateY: 90, opacity: 0, y: 8 }}
                  animate={{ rotateY: 0, opacity: 1, y: 0 }}
                  transition={
                    reduceMotion
                      ? undefined
                      : { delay: i * 0.08, duration: 0.45, ease: 'easeOut' }
                  }
                  style={{ transformPerspective: 800 }}
                >
                  <Card card={card} size="small" disabled className="shadow-lg" />
                </motion.div>
              </div>
            ))}

            {cards.length === 0 && (
              <div className="text-slate-400 text-sm py-8">Chồng bài hiện đang trống</div>
            )}
          </div>
        </div>

        <button
          onClick={() => {
            soundEffects.playClick();
            onClose();
          }}
          className="px-8 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl font-black text-sm font-display transition-all shadow-lg shadow-purple-600/30 cursor-pointer"
        >
          👁️ ĐÃ HIỂU & GHI NHỚ
        </button>
    </ModalShell>
  );
}

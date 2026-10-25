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
      panelClassName="paper-modal max-w-lg w-full p-6 text-center sm:p-7"
    >
        <div className="w-14 h-14 mx-auto mb-2 rounded-[4px] bg-[var(--paper-2)] border-2 border-[var(--ink)] flex items-center justify-center shadow-[2px_2px_0_var(--hard-shadow)]">
          <img src="/cards/see-the-future.svg" alt="Nhìn tương lai" className="w-10 h-10 object-contain" />
        </div>

        <h2 className="text-xl sm:text-2xl font-black text-[var(--ink)] mb-1 font-display tracking-wide">
          🔮 NHÌN TRƯỚC TƯƠNG LAI
        </h2>
        <p className="text-xs sm:text-sm text-[var(--ink-soft)] mb-5">
          3 lá trên cùng của chồng bài rút — chỉ một mình bạn nhìn thấy!
        </p>

        {/* Danh sách 3 lá bài tương lai */}
        <div className="relative mb-6">
          <div className="relative flex justify-center items-end gap-3 sm:gap-4 overflow-x-auto pb-2">
            {cards.map((card, i) => (
              <div key={card.id || i} className="flex flex-col items-center">
                <div
                  className={`text-[10px] sm:text-xs font-bold mb-1.5 px-2 py-0.5 rounded-[3px] border-2 ${
                    i === 0
                      ? 'bg-[#F3D8D2] border-[var(--oxblood)] text-[var(--oxblood)]'
                      : 'bg-[var(--paper-2)] border-[var(--line)] text-[var(--ink-soft)]'
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
          className="landing-btn landing-btn--oxblood px-8 py-3 text-sm"
        >
          👁️ ĐÃ HIỂU & GHI NHỚ
        </button>
    </ModalShell>
  );
}

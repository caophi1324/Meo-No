import { motion, AnimatePresence } from 'framer-motion';
import { CARD_DATA } from '../data/cardData';
import { CARD_TYPES, CAT_CARDS, BEAST_CARDS, WILD_BEAST } from '../../../shared/cardTypes.js';

export default function CardSkillInspector({
  selectedCards = [],
  cards = [],
  comboInfo = null,
  canUseNope = false,
  onUseNope,
}) {
  // Tìm các lá bài đang được chọn
  const activeCards = cards.filter((c) => selectedCards.includes(c.id));
  const primaryCard = activeCards[activeCards.length - 1] || null;
  const primaryInfo = primaryCard ? (CARD_DATA[primaryCard.type] || primaryCard) : null;

  return (
    <div className="w-full max-w-3xl mx-auto px-2 select-none">
      <AnimatePresence mode="wait">
        {primaryInfo ? (
          <motion.div
            key={primaryCard.id + (comboInfo?.comboSize || 0)}
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            className="rounded-2xl p-3 sm:p-3.5 bg-gradient-to-r from-slate-900/95 via-slate-850 to-slate-900/95 border-2 shadow-xl backdrop-blur-md relative overflow-hidden"
            style={{
              borderColor: primaryInfo.borderColor || '#F59E0B',
              boxShadow: `0 8px 24px rgba(0, 0, 0, 0.4), 0 0 16px ${primaryInfo.glowColor || 'rgba(245, 158, 11, 0.2)'}`,
            }}
          >
            {/* Ambient subtle glow */}
            <div
              className="absolute top-0 right-0 w-48 h-20 rounded-full blur-2xl opacity-20 pointer-events-none"
              style={{ backgroundColor: primaryInfo.borderColor || '#F59E0B' }}
            />

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
              {/* Header: Icon + Tên + Badge phân loại */}
              <div className="flex items-center gap-2.5 flex-shrink-0">
                <div
                  className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center text-2xl shadow-inner border border-white/20 flex-shrink-0"
                  style={{ backgroundColor: primaryInfo.bgColor || '#1E293B' }}
                >
                  {primaryInfo.emoji || '🃏'}
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className="text-sm sm:text-base font-black font-display tracking-wide drop-shadow"
                      style={{ color: primaryInfo.accentColor || '#FDE047' }}
                    >
                      {primaryInfo.nameVN}
                    </span>
                    <span
                      className={`text-[9px] sm:text-[10px] font-black uppercase px-2 py-0.5 rounded-full text-white bg-gradient-to-r ${
                        primaryInfo.headerBg || 'from-slate-700 to-slate-800'
                      } border border-white/20 shadow-xs`}
                    >
                      {primaryInfo.badgeText || 'KỸ NĂNG'}
                    </span>
                  </div>

                  {activeCards.length > 1 && (
                    <div className="text-[10px] text-amber-300 font-bold mt-0.5 flex items-center gap-1">
                      <span>✨ Đang chọn:</span>
                      <span className="bg-amber-950/80 px-1.5 py-0.2 rounded border border-amber-600/50">
                        {activeCards.length} lá bài
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Chi tiết kỹ năng & Gợi ý sử dụng */}
              <div className="flex-1 text-left sm:text-right">
                <p className="text-xs sm:text-sm text-slate-200 font-medium leading-snug">
                  {primaryInfo.descriptionVN}
                </p>

                {/* Gợi ý combo nếu là lá mèo */}
                {(CAT_CARDS.includes(primaryCard.type) ||
                  BEAST_CARDS.includes(primaryCard.type) ||
                  primaryCard.type === WILD_BEAST) && (
                  <div className="text-[10px] sm:text-[11px] text-amber-300/90 font-semibold mt-1">
                    💡 Ghép 2 lá để cướp 1 lá úp • Ghép 3 lá để đòi đích danh loại bài!
                  </div>
                )}
              </div>
            </div>

            {/* Banner báo Combo hợp lệ nếu đang chọn từ 2 lá trở lên */}
            {comboInfo?.valid && comboInfo?.comboSize > 0 && (
              <div className="mt-2.5 pt-2 border-t border-white/10 flex items-center justify-between text-xs font-bold text-amber-300">
                <span className="flex items-center gap-1.5">
                  <span className="animate-spin text-sm">⚡</span>
                  <span>{comboInfo.label}</span>
                </span>
                <span className="text-[11px] text-slate-300 font-normal">
                  {comboInfo.reason}
                </span>
              </div>
            )}

            {[CARD_TYPES.NOPE, CARD_TYPES.CHONG_XAO_BAI].includes(primaryCard.type) && canUseNope && (
              <div className="mt-2.5 border-t border-white/10 pt-2 text-right">
                <button
                  type="button"
                  onClick={onUseNope}
                  className="rounded-xl bg-gradient-to-r from-red-600 to-rose-600 px-4 py-2 text-xs font-black text-white shadow-lg shadow-red-600/30 transition-all hover:from-red-500 hover:to-rose-500 active:scale-95"
                >
                  🚫 DÙNG NOPE
                </button>
              </div>
            )}
          </motion.div>
        ) : (
          /* Trạng thái chưa chọn bài nào */
          <motion.div
            key="empty-hint"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="py-1 px-3 rounded-xl bg-slate-900/60 border border-slate-800/80 text-center text-[11px] text-slate-400 flex items-center justify-center gap-1.5"
          >
            <span>💡</span>
            <span>
              <strong>Nhấp vào bất kỳ lá bài nào</strong> trên tay để xem ghi chú chức năng chi tiết và kích hoạt đánh bài.
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

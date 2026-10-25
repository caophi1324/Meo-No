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
            className="paper-panel relative overflow-hidden p-3 sm:p-3.5"
            style={{
              borderLeft: `4px solid ${primaryInfo.borderColor || '#C9922E'}`,
            }}
          >
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
              {/* Header: Icon + Tên + Badge phân loại */}
              <div className="flex items-center gap-2.5 flex-shrink-0">
                <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-[4px] flex items-center justify-center text-2xl border-2 border-[var(--ink)] bg-[var(--paper-2)] flex-shrink-0">
                  {primaryInfo.emoji || '🃏'}
                </div>

                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm sm:text-base font-black font-display tracking-wide text-[var(--ink)]">
                      {primaryInfo.nameVN}
                    </span>
                    <span className="landing-chip">
                      {primaryInfo.badgeText || 'KỸ NĂNG'}
                    </span>
                  </div>

                  {activeCards.length > 1 && (
                    <div className="text-[10px] text-[var(--oxblood)] font-bold mt-1 flex items-center gap-1">
                      <span>✨ Đang chọn:</span>
                      <span className="landing-chip">{activeCards.length} lá bài</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Chi tiết kỹ năng & Gợi ý sử dụng */}
              <div className="flex-1 text-left sm:text-right">
                <p className="text-xs sm:text-sm text-[var(--ink-soft)] font-medium leading-snug">
                  {primaryInfo.descriptionVN}
                </p>

                {/* Gợi ý combo nếu là lá mèo */}
                {(CAT_CARDS.includes(primaryCard.type) ||
                  BEAST_CARDS.includes(primaryCard.type) ||
                  primaryCard.type === WILD_BEAST) && (
                  <div className="text-[10px] sm:text-[11px] text-[var(--oxblood)] font-semibold mt-1">
                    💡 Ghép 2 lá để cướp 1 lá úp • Ghép 3 lá để đòi đích danh loại bài!
                  </div>
                )}
              </div>
            </div>

            {/* Banner báo Combo hợp lệ nếu đang chọn từ 2 lá trở lên */}
            {comboInfo?.valid && comboInfo?.comboSize > 0 && (
              <div className="mt-2.5 pt-2 border-t-2 border-[var(--line)] flex items-center justify-between gap-2 text-xs font-bold text-[var(--oxblood)]">
                <span className="flex items-center gap-1.5">
                  <span className="text-sm">⚡</span>
                  <span>{comboInfo.label}</span>
                </span>
                <span className="text-[11px] text-[var(--ink-soft)] font-normal">
                  {comboInfo.reason}
                </span>
              </div>
            )}

            {[CARD_TYPES.NOPE, CARD_TYPES.CHONG_XAO_BAI].includes(primaryCard.type) && canUseNope && (
              <div className="mt-2.5 border-t-2 border-[var(--line)] pt-2 text-right">
                <button
                  type="button"
                  onClick={onUseNope}
                  className="landing-btn landing-btn--oxblood px-4 py-2 text-xs"
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
            className="py-1.5 px-3 rounded-[4px] bg-[var(--paper-2)] border-2 border-[var(--ink)] text-center text-[11px] text-[var(--ink-soft)] flex items-center justify-center gap-1.5 shadow-[2px_2px_0_var(--hard-shadow)]"
          >
            <span>💡</span>
            <span>
              <strong className="text-[var(--ink)]">Nhấp vào bất kỳ lá bài nào</strong> trên tay để xem ghi chú chức năng chi tiết và kích hoạt đánh bài.
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

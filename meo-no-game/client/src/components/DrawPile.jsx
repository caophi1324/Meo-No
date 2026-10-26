import { useEffect, useRef } from 'react';
import { motion, useAnimationControls, useReducedMotion } from 'framer-motion';
import AnimatedCount from './AnimatedCount';
import useGameStore from '../store/gameStore';
import { themedImage, cardBackFor } from '../../../shared/decks.js';
import { CARD_DATA } from '../data/cardData';

export default function DrawPile({ count = 0, topCard = null, onClick, disabled = false, insert = null, onInsertDone = null }) {
  const controls = useAnimationControls();
  const reduceMotion = useReducedMotion();
  const previous = useRef(count);
  useEffect(() => {
    if (count < previous.current && !reduceMotion) controls.start({ scaleX: [1, 1.06, 1], scaleY: [1, .91, 1], transition: { duration: .2 } });
    previous.current = count;
  }, [count, controls, reduceMotion]);
  // Danger indicator if deck has very few cards
  const isDanger = count > 0 && count <= 8;
  const deckTheme = useGameStore((s) => s.deckTheme);
  const isLol = deckTheme === 'lol';
  const topImage = isLol && topCard?.lolImage ? topCard.lolImage : topCard?.image;
  const inset = insert ? CARD_DATA[insert.type] || {} : null;
  const frontImage = insert
    ? themedImage(isLol && inset?.lolImage ? inset.lolImage : inset?.image || '/cards/custom/MN001.jpg', deckTheme)
    : null;
  const backImage = cardBackFor(deckTheme);

  return (
    <div className="flex flex-col items-center gap-2 group">
      {/* Khối chồng bài rút với hiệu ứng 3D phân lớp */}
      <motion.div
        data-draw-pile
        animate={controls}
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
        className={`relative w-24 h-34 sm:w-28 sm:h-40 flex items-center justify-center cursor-pointer select-none transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mustard)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--felt-dark)] ${
          disabled ? 'opacity-60 cursor-not-allowed filter grayscale-30' : 'cursor-pointer'
        }`}
      >
        {/* Lớp bóng đổ chân bàn */}
        <div className="absolute -bottom-2 w-24 h-5 bg-[var(--hard-shadow)]/60 rounded-full blur-md pointer-events-none" />

        {/* Lớp bài thứ 3 (đáy chồng) */}
        {count >= 3 && (
          <div
            className="absolute inset-0 translate-x-1.5 translate-y-2 rounded-[6px] border-2 border-[var(--wood)] bg-[var(--felt-dark)] shadow-[3px_3px_0_var(--hard-shadow)] transition-transform duration-200"
            style={{ transform: `rotate(2deg) translate(4px, ${insert ? 10 : 4}px)` }}
          >
            <div className="w-full h-full rounded-[4px] bg-[var(--felt)] border border-[var(--wood)]" />
          </div>
        )}

        {/* Lớp bài thứ 2 (giữa chồng) */}
        {count >= 2 && (
          <div
            className="absolute inset-0 translate-x-0.5 translate-y-1 rounded-[6px] border-2 border-[var(--wood)] bg-[var(--felt)] shadow-[2px_2px_0_var(--hard-shadow)] transition-transform duration-200"
            style={{ transform: `rotate(-1.5deg) translate(-2px, ${insert ? 7 : 2}px)` }}
          >
            <div className="w-full h-full rounded-[4px] bg-[var(--felt-dark)] border border-[var(--wood)]" />
          </div>
        )}

        {/* Lá bài trên cùng của chồng rút */}
        <div
          className={`relative w-full h-full rounded-[6px] overflow-hidden border-2 transition-all duration-300 shadow-[4px_4px_0_var(--hard-shadow)] ${
            topCard ? 'imploding-flip' : ''
          } ${
            !disabled
              ? 'border-[var(--mustard)] group-hover:border-[var(--oxblood)]'
              : 'border-[var(--ink-soft)]'
          }`}
        >
          {topCard ? (
            <img
              src={themedImage(topImage || '/cards/custom/MN001.jpg', deckTheme)}
              alt={topCard.nameVN || 'Imploding Kitten mặt ngửa'}
              className="w-full h-full object-cover rounded-[4px]"
              style={isLol ? { objectPosition: 'center 20%' } : undefined}
            />
          ) : (
            <img
              src={cardBackFor(deckTheme)}
              alt="Chồng bài rút"
              className="w-full h-full object-cover rounded-[4px]"
            />
          )}

          {topCard && (
            <div className="absolute inset-0 rounded-[4px] border-2 border-[var(--oxblood)] shadow-[0_0_18px_rgba(123,45,38,0.55)] pointer-events-none">
              {!isLol && (
                <span className="absolute inset-x-1 bottom-2 rounded-[2px] border border-[var(--paper)]/30 bg-[var(--oxblood)] px-1 py-0.5 text-center text-[8px] font-black uppercase tracking-wider text-[var(--paper)]">
                  Mặt ngửa
                </span>
              )}
            </div>
          )}

          {/* Lớp phủ sáng bóng kính */}
          <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent pointer-events-none" />

          {/* Hiệu ứng nhấp nháy khẩn cấp nếu bài sắp hết */}
          {isDanger && (
            <div className="absolute inset-0 bg-[var(--oxblood)]/15 pointer-events-none" />
          )}

          {/* Gợi ý Rút Bài khi đến lượt */}
          {!disabled && (
            <div className="absolute inset-x-2 bottom-3 rounded-[3px] border-2 border-[var(--ink)] bg-[var(--mustard)] py-1 text-center font-display text-[10px] sm:text-xs font-black uppercase tracking-wider text-[var(--ink)] shadow-[2px_2px_0_var(--hard-shadow)]">
              RÚT BÀI
            </div>
          )}
        </div>

        {/* Lá được nhét trở lại bộ: trượt vào khe, lật mặt rồi mới biến mất */}
        {insert && (
          <motion.div
            key={insert.id}
            className="pointer-events-none absolute left-1/2 top-1/2 z-30 h-[104px] w-[76px] -translate-x-1/2 -translate-y-1/2"
            style={{ transformStyle: 'preserve-3d', perspective: 700 }}
            initial={reduceMotion ? { opacity: 0 } : { x: 96, y: 28, opacity: 0, rotateY: insert.faceUp ? 180 : 0 }}
            animate={reduceMotion ? { opacity: [0, 1, 0] } : {
              x: insert.index % 2 ? 3 : -3,
              y: Math.min(18, Math.round((insert.index / Math.max(1, insert.count)) * 18)),
              opacity: 1,
              rotateY: insert.faceUp ? 360 : 180,
            }}
            transition={reduceMotion ? { duration: .25 } : { duration: .55, ease: [.22, .9, .3, 1.05] }}
            onAnimationComplete={() => onInsertDone?.()}
          >
            <img src={frontImage} alt="" className="absolute inset-0 h-full w-full rounded-[6px] border-2 border-[var(--mustard)] object-cover" style={{ backfaceVisibility: 'hidden' }} />
            <img src={backImage} alt="" className="absolute inset-0 h-full w-full rounded-[6px] border-2 border-[var(--oxblood)] object-cover" style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }} />
          </motion.div>
        )}
      </motion.div>

      {/* Huy hiệu đếm số lượng lá bài còn lại */}
      <div className="flex items-center gap-1.5 rounded-[4px] border-2 border-[var(--ink)] bg-[var(--paper)] px-3 py-1 text-[var(--ink)] shadow-[2px_2px_0_var(--hard-shadow)]">
        <span className="text-xs font-bold font-display">
          <AnimatedCount value={count}/> <span className="text-[var(--ink-soft)] font-normal text-[10px]">lá còn lại</span>
        </span>
        {isDanger && (
          <span className="text-xs text-[var(--oxblood)] font-bold" title="Nguy cơ cao rút phải Mèo Nổ!">
            ⚠️
          </span>
        )}
      </div>
    </div>
  );
}

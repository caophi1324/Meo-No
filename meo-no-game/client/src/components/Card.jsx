import { motion } from 'framer-motion';
import { CARD_DATA } from '../data/cardData';
import useGameStore from '../store/gameStore';
import { themedImage } from '../../../shared/decks.js';

export default function Card({
  card,
  faceDown = false,
  selected = false,
  onClick,
  size = 'normal', // 'normal' | 'small' | 'tiny'
  className = '',
  disabled = false,
  highlighted = false,
}) {
  const cardInfo = card ? (CARD_DATA[card.type] || card) : {};
  const deckTheme = useGameStore((s) => s.deckTheme);
  const borderColor = cardInfo.borderColor || '#64748B';
  const glowColor = cardInfo.glowColor || 'rgba(100, 116, 139, 0.3)';
  const headerBg = cardInfo.headerBg || 'from-slate-700 to-slate-800';
  const accentColor = cardInfo.accentColor || '#CBD5E1';
  const interactive = !disabled && !!onClick;
  const keyboardProps = interactive
    ? {
        role: 'button',
        tabIndex: 0,
        onKeyDown: (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onClick();
          }
        },
        'aria-pressed': selected,
        'aria-label': `${cardInfo.nameVN || 'Lá bài'}${selected ? ', đang chọn' : highlighted ? ', có thể dùng' : ''}`,
      }
    : {};

  // Size variations
  const sizeClasses = {
    tiny: 'w-10 h-14 rounded-md border text-[9px]',
    small: 'w-18 h-26 sm:w-20 sm:h-28 rounded-xl border-2 text-[10px]',
    normal: 'w-22 h-32 sm:w-24 sm:h-36 md:w-28 md:h-40 rounded-2xl border-2 sm:border-3 text-xs',
  }[size] || 'w-22 h-32 sm:w-24 sm:h-36 md:w-28 md:h-40 rounded-2xl border-2 sm:border-3 text-xs';

  if (faceDown) {
    return (
      <motion.div
        {...keyboardProps}
        aria-disabled={disabled || undefined}
        title={disabled ? 'Bị Làm Phiền' : undefined}
        tabIndex={interactive ? 0 : -1}
        whileHover={!disabled && onClick ? { scale: 1.05, y: -4 } : {}}
        whileTap={!disabled && onClick ? { scale: 0.96 } : {}}
        onClick={disabled ? undefined : onClick}
        className={`relative select-none flex-shrink-0 cursor-pointer overflow-hidden shadow-xl transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 ${sizeClasses} ${disabled ? 'opacity-50 grayscale-[0.35] ring-2 ring-red-500/80' : ''} ${className}`}
        style={{
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.45), 0 2px 6px rgba(0,0,0,0.3)',
          borderColor: disabled ? '#EF4444' : '#D97706',
        }}
      >
        <img
          src="/cards/card-back.svg"
          alt="Lưng bài Mèo Nổ"
          className="w-full h-full object-cover rounded-xl"
        />
        {/* Subtle 3D Card Edge Highlight */}
        <div className="absolute inset-0 rounded-xl pointer-events-none border border-white/20 shadow-inner" />
        {disabled && <div className="pointer-events-none absolute inset-0 z-40 bg-slate-950/25" />}
      </motion.div>
    );
  }

  if (cardInfo.imageOnly && cardInfo.image) {
    return (
      <motion.div
        {...keyboardProps}
        aria-disabled={disabled || undefined}
        title={disabled ? 'Bị Làm Phiền' : undefined}
        tabIndex={interactive ? 0 : -1}
        whileHover={interactive ? { y: -4 } : undefined}
        whileTap={interactive ? { scale: 0.97 } : undefined}
        onClick={disabled ? undefined : onClick}
        className={`relative select-none overflow-hidden shadow-xl transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 ${sizeClasses} ${
          selected
            ? 'ring-4 ring-yellow-400 ring-offset-2 ring-offset-slate-900 z-20'
            : highlighted
              ? 'nope-glow ring-2 ring-red-400 z-10'
              : disabled
                ? 'opacity-50 grayscale-[0.35] ring-2 ring-red-500/80'
                : ''
        } ${interactive ? 'cursor-pointer' : ''} ${className}`}
        style={{ borderColor: disabled ? '#EF4444' : selected ? '#FACC15' : borderColor }}
      >
        <img
          src={themedImage(cardInfo.image, deckTheme)}
          alt={cardInfo.nameVN || card?.name || 'Lá bài'}
          className="h-full w-full object-cover"
          loading="lazy"
        />
        {selected && (
          <div className="absolute right-1 top-1 z-30 flex h-5 w-5 items-center justify-center rounded-full border-2 border-white bg-yellow-400 text-xs font-black text-slate-950 shadow-md">
            ✓
          </div>
        )}
        {highlighted && (
          <div className="absolute left-1/2 top-1 z-30 -translate-x-1/2 rounded-full border border-red-200 bg-red-600 px-2 py-0.5 text-[9px] font-black tracking-wider text-white shadow-lg animate-pulse motion-reduce:animate-none">
            NOPE!
          </div>
        )}
        {disabled && <div className="pointer-events-none absolute inset-0 z-40 bg-slate-950/25" />}
      </motion.div>
    );
  }

  return (
    <motion.div
      {...keyboardProps}
      aria-disabled={disabled || undefined}
      title={disabled ? 'Bị Làm Phiền' : undefined}
      tabIndex={interactive ? 0 : -1}
      layout
      layoutId={card?.id}
      whileHover={
        !disabled
          ? {
              scale: 1.06,
              y: selected ? -18 : -10,
              zIndex: 30,
              boxShadow: `0 16px 32px ${glowColor}, 0 4px 12px rgba(0,0,0,0.5)`,
            }
          : {}
      }
      whileTap={!disabled ? { scale: 0.96 } : {}}
      onClick={disabled ? undefined : onClick}
      animate={{
        y: selected ? -14 : 0,
      }}
      transition={{ type: 'spring', stiffness: 350, damping: 26 }}
      className={`group relative select-none flex flex-col justify-between overflow-hidden shadow-xl flex-shrink-0 cursor-pointer transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 ${sizeClasses} ${className} ${
        selected
          ? 'ring-4 ring-yellow-400 ring-offset-2 ring-offset-slate-900 z-20'
          : highlighted
            ? 'nope-glow ring-2 ring-red-400 z-10'
            : disabled
              ? 'opacity-50 grayscale-[0.35] ring-2 ring-red-500/80'
              : ''
      }`}
      style={{
        backgroundColor: cardInfo.bgColor || '#1E293B',
        borderColor: disabled ? '#EF4444' : selected ? '#FACC15' : borderColor,
        boxShadow: selected
          ? `0 14px 28px rgba(250, 204, 21, 0.4), 0 0 15px ${borderColor}`
          : `0 6px 18px rgba(0, 0, 0, 0.45), 0 0 10px ${glowColor}`,
      }}
    >
      {/* Lớp bóng kim loại / foil lấp lánh khi hover */}
      <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none duration-300" />

      {/* Huy hiệu chọn bài */}
      {selected && (
        <div className="absolute -top-1.5 -right-1.5 z-30 bg-yellow-400 text-slate-950 rounded-full w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center font-black text-xs shadow-md border-2 border-white animate-bounce">
          ✓
        </div>
      )}

      {highlighted && (
        <div className="absolute -top-2 left-1/2 z-30 -translate-x-1/2 rounded-full border border-red-200 bg-red-600 px-2 py-0.5 text-[9px] font-black tracking-wider text-white shadow-lg animate-pulse motion-reduce:animate-none">
          NOPE!
        </div>
      )}

      {/* Phần đầu lá bài: Header Bar */}
      <div
        className={`w-full py-0.5 sm:py-1 px-1 sm:px-1.5 bg-gradient-to-r ${headerBg} flex items-center justify-between border-b border-white/20`}
      >
        <span className="text-[10px] sm:text-xs leading-none">{cardInfo.emoji || '🃏'}</span>
        <span className="font-extrabold uppercase tracking-wider text-[8px] sm:text-[9px] md:text-[10px] text-white font-display truncate px-0.5 drop-shadow">
          {cardInfo.badgeText || cardInfo.nameVN}
        </span>
        <span className="text-[10px] sm:text-xs leading-none">{cardInfo.emoji || '🃏'}</span>
      </div>

      {/* Khung hình minh họa trung tâm */}
      <div className="flex-1 w-full px-1 sm:px-1.5 py-0.5 sm:py-1 flex items-center justify-center relative overflow-hidden">
        <div
          className="w-full h-full rounded-lg sm:rounded-xl overflow-hidden flex items-center justify-center p-0.5 relative border border-white/10"
          style={{
            background: `radial-gradient(circle at center, rgba(255,255,255,0.15) 0%, rgba(0,0,0,0.3) 100%)`,
          }}
        >
          {cardInfo.image ? (
            <img
              src={themedImage(cardInfo.image, deckTheme)}
              alt={cardInfo.nameVN}
              className="w-full h-full object-contain filter drop-shadow group-hover:scale-105 transition-transform duration-300"
              loading="lazy"
            />
          ) : (
            <div className="text-3xl">{cardInfo.emoji || '🐱'}</div>
          )}
        </div>
      </div>

      {/* Phần chân bài: Tên lá bài & Tip ngắn */}
      <div className="w-full px-1 sm:px-2 pb-1 sm:pb-1.5 pt-0.5 flex flex-col items-center text-center bg-black/40 backdrop-blur-xs border-t border-white/10">
        <div
          className="font-black text-[10px] sm:text-xs md:text-sm leading-tight truncate w-full font-display drop-shadow"
          style={{ color: accentColor }}
        >
          {cardInfo.nameVN || 'Lá bài'}
        </div>

        {/* Short rule tip (chỉ hiển thị ở size normal) */}
        {size === 'normal' && cardInfo.shortTip && (
          <div className="text-[8px] sm:text-[9px] text-slate-300/90 leading-tight mt-0.5 line-clamp-1 w-full font-medium">
            {cardInfo.shortTip}
          </div>
        )}
      </div>

      {/* Khung viền 3D nổi viền trong */}
      <div className="absolute inset-0 rounded-2xl pointer-events-none border border-white/15" />
      {disabled && <div className="pointer-events-none absolute inset-0 z-40 bg-slate-950/25" />}
    </motion.div>
  );
}

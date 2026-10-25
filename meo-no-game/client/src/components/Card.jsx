import { motion } from 'framer-motion';
import { CARD_DATA } from '../data/cardData';
import useGameStore from '../store/gameStore';
import { themedImage } from '../../../shared/decks.js';
import { BEAST_CARDS, CARD_TYPES } from '../../../shared/cardTypes.js';

const LOL_BEAST_EMOJI = {
  [CARD_TYPES.CAO_LUA]: '🦊',
  [CARD_TYPES.HO_VAN]: '🐺',
  [CARD_TYPES.CHIM_UNG]: '🦡',
  [CARD_TYPES.CA_CHEP]: '🐱',
  [CARD_TYPES.HUOU_SAO]: '🦌',
};

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
  const isLol = deckTheme === 'lol';
  const cardImage = isLol && card?.lolImage ? card.lolImage : cardInfo.image;
  const isLolBeast = isLol && BEAST_CARDS.includes(card?.type);
  const cardTitle = isLolBeast
    ? card?.lolName || cardInfo.nameVN
    : cardInfo.nameVN || cardInfo.badgeText;
  const cardSubtitle = isLol ? card?.lolSkinName || card?.lolName : null;
  const cardEmoji = isLolBeast ? LOL_BEAST_EMOJI[card.type] || cardInfo.emoji : cardInfo.emoji;
  const borderColor = cardInfo.borderColor || '#64748B';
  const glowColor = cardInfo.glowColor || 'rgba(100, 116, 139, 0.3)';
  const headerBg = cardInfo.headerBg || 'from-slate-700 to-slate-800';
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
        'aria-label': `${cardTitle || 'Lá bài'}${cardSubtitle ? ` (${cardSubtitle})` : ''}${selected ? ', đang chọn' : highlighted ? ', có thể dùng' : ''}`,
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
        className={`relative select-none flex-shrink-0 cursor-pointer overflow-hidden shadow-xl transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mustard)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--felt-dark)] ${sizeClasses} ${selected ? 'ring-4 ring-[var(--mustard)] ring-offset-2 ring-offset-[var(--felt-dark)] z-20' : ''} ${disabled ? 'opacity-50 grayscale-[0.35] ring-2 ring-[var(--oxblood)]' : ''} ${className}`}
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
        {selected && (
          <div className="absolute right-1 top-1 z-30 flex h-5 w-5 items-center justify-center rounded-[3px] border-2 border-[var(--ink)] bg-[var(--mustard)] text-xs font-black text-[var(--ink)] shadow-[1px_1px_0_var(--hard-shadow)]">
            ✓
          </div>
        )}
        {disabled && <div className="pointer-events-none absolute inset-0 z-40 bg-slate-950/25" />}
      </motion.div>
    );
  }

  if (cardInfo.imageOnly && cardImage) {
    return (
      <motion.div
        {...keyboardProps}
        aria-disabled={disabled || undefined}
        title={disabled ? 'Bị Làm Phiền' : undefined}
        tabIndex={interactive ? 0 : -1}
        whileHover={interactive ? { y: -4 } : undefined}
        whileTap={interactive ? { scale: 0.97 } : undefined}
        onClick={disabled ? undefined : onClick}
        className={`relative select-none overflow-hidden shadow-xl transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mustard)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--felt-dark)] ${sizeClasses} ${
          selected
            ? 'ring-4 ring-[var(--mustard)] ring-offset-2 ring-offset-[var(--felt-dark)] z-20'
            : highlighted
              ? 'nope-glow ring-2 ring-red-400 z-10'
              : disabled
                ? 'opacity-50 grayscale-[0.35] ring-2 ring-[var(--oxblood)]'
                : ''
        } ${interactive ? 'cursor-pointer' : ''} ${className}`}
        style={{ borderColor: disabled ? 'var(--oxblood)' : selected ? 'var(--mustard)' : borderColor }}
      >
        <img
          src={themedImage(cardImage, deckTheme)}
          alt={cardTitle || 'Lá bài'}
          className="h-full w-full object-cover"
          style={isLol ? { objectPosition: 'center 20%' } : undefined}
          loading="lazy"
        />
        {isLol && (
          <div className="absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-slate-950 via-slate-950/85 to-transparent px-1.5 pb-1 pt-6 text-center">
            <div className="truncate text-[9px] font-black uppercase tracking-wide text-white">
              {cardTitle || 'Lá bài'}
            </div>
            {cardSubtitle && (
              <div className="truncate text-[7px] font-bold text-[var(--mustard)]">{cardSubtitle}</div>
            )}
          </div>
        )}
        {selected && (
          <div className="absolute right-1 top-1 z-30 flex h-5 w-5 items-center justify-center rounded-[3px] border-2 border-[var(--ink)] bg-[var(--mustard)] text-xs font-black text-[var(--ink)] shadow-[1px_1px_0_var(--hard-shadow)]">
            ✓
          </div>
        )}
        {highlighted && (
          <div className="absolute left-1/2 top-1 z-30 -translate-x-1/2 rounded-[2px] border-2 border-[var(--ink)] bg-[var(--oxblood)] px-2 py-0.5 text-[9px] font-black tracking-wider text-[var(--paper)] shadow-[1px_1px_0_var(--hard-shadow)]">
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
      className={`group relative select-none flex flex-col justify-between overflow-hidden shadow-xl flex-shrink-0 cursor-pointer transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mustard)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--felt-dark)] ${sizeClasses} ${className} ${
        selected
          ? 'ring-4 ring-[var(--mustard)] ring-offset-2 ring-offset-[var(--felt-dark)] z-20'
          : highlighted
            ? 'nope-glow ring-2 ring-red-400 z-10'
            : disabled
              ? 'opacity-50 grayscale-[0.35] ring-2 ring-[var(--oxblood)]'
              : ''
      }`}
      style={{
        backgroundColor: cardInfo.bgColor || '#1E293B',
        borderColor: disabled ? 'var(--oxblood)' : selected ? 'var(--mustard)' : borderColor,
        boxShadow: selected
          ? `0 14px 28px rgba(201, 146, 46, 0.35), 0 0 15px ${borderColor}`
          : `0 6px 18px rgba(0, 0, 0, 0.45), 0 0 10px ${glowColor}`,
      }}
    >
      {/* Lớp bóng kim loại / foil lấp lánh khi hover */}
      <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none duration-300" />

      {/* Huy hiệu chọn bài */}
      {selected && (
        <div className="absolute -top-1.5 -right-1.5 z-30 bg-[var(--mustard)] text-[var(--ink)] rounded-[3px] w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center font-black text-xs shadow-[1px_1px_0_var(--hard-shadow)] border-2 border-[var(--ink)]">
          ✓
        </div>
      )}

      {highlighted && (
        <div className="absolute -top-2 left-1/2 z-30 -translate-x-1/2 rounded-[2px] border-2 border-[var(--ink)] bg-[var(--oxblood)] px-2 py-0.5 text-[9px] font-black tracking-wider text-[var(--paper)] shadow-[1px_1px_0_var(--hard-shadow)]">
          NOPE!
        </div>
      )}

      {/* Phần đầu lá bài: Header Bar */}
      <div
        className={`w-full py-0.5 sm:py-1 px-1 sm:px-1.5 bg-gradient-to-r ${headerBg} flex items-center justify-between border-b border-white/20`}
      >
        <span className="text-[10px] sm:text-xs leading-none">{cardEmoji || '🃏'}</span>
        <span className="font-extrabold uppercase tracking-wider text-[8px] sm:text-[9px] md:text-[10px] text-white font-display truncate px-0.5 drop-shadow">
          {cardTitle || 'Lá bài'}
        </span>
        <span className="text-[10px] sm:text-xs leading-none">{cardEmoji || '🃏'}</span>
      </div>

      {isLol && cardSubtitle && (
        <div className="w-full px-1 text-center text-[7px] font-bold uppercase tracking-wider text-[var(--oxblood)] truncate">
          {cardSubtitle}
        </div>
      )}

      {/* Khung hình minh họa trung tâm */}
      <div className="flex-1 w-full px-1 sm:px-1.5 py-0.5 sm:py-1 flex items-center justify-center relative overflow-hidden">
        <div
          className="w-full h-full rounded-lg sm:rounded-xl overflow-hidden flex items-center justify-center p-0.5 relative border border-white/10"
          style={{
            background: `radial-gradient(circle at center, rgba(255,255,255,0.15) 0%, rgba(0,0,0,0.3) 100%)`,
          }}
        >
          {cardImage ? (
            <img
              src={themedImage(cardImage, deckTheme)}
              alt={`${cardTitle}${cardSubtitle ? ` — ${cardSubtitle}` : ''}`}
              className={`w-full h-full filter drop-shadow group-hover:scale-105 transition-transform duration-300 ${
                isLol ? 'object-cover' : 'object-contain'
              }`}
              style={isLol ? { objectPosition: 'center 30%' } : undefined}
              loading="lazy"
            />
          ) : (
            <div className="text-3xl">{cardInfo.emoji || '🐱'}</div>
          )}
        </div>
      </div>

      {/* Khung viền 3D nổi viền trong */}
      <div className="absolute inset-0 rounded-2xl pointer-events-none border border-white/15" />
      {disabled && <div className="pointer-events-none absolute inset-0 z-40 bg-slate-950/25" />}
    </motion.div>
  );
}

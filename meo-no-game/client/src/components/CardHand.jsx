import { useEffect, useMemo, useState } from 'react';
import Card from './Card';
import CardSkillInspector from './CardSkillInspector';
import { CARD_DATA } from '../data/cardData';
import { soundEffects } from '../utils/soundEffects';
import { sortCards } from '../utils/cardSorter';
import useGameStore from '../store/gameStore';

export default function CardHand({
  cards = [],
  selectedIds = [],
  onToggle,
  onDraw,
  onPlay,
  canAct = false,
  playLabel = 'CHƠI BÀI',
  playDisabled = false,
  comboInfo = null,
  highlightType = null,
  highlightTypes = null,
  canUseNope = false,
  onUseNope,
  hideActions = false,
}) {
  const active = useGameStore(s => s.cardEffect);
  // Chế độ sắp xếp bài: 'function' (theo tính năng - mặc định) | 'combos' (ưu tiên combo) | 'name' (A-Z)
  const [sortMode, setSortMode] = useState('function');
  const [query, setQuery] = useState('');
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia('(max-width: 639px)').matches : false
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(max-width: 639px)');
    const onChange = (event) => setIsMobile(event.matches);
    if (mq.addEventListener) mq.addEventListener('change', onChange);
    else mq.addListener(onChange);
    return () => {
      if (mq.removeEventListener) mq.removeEventListener('change', onChange);
      else mq.removeListener(onChange);
    };
  }, []);

  // Danh sách bài đã được sắp xếp
  const sortedCards = useMemo(() => {
    return sortCards(cards, sortMode);
  }, [cards, sortMode]);

  const norm = (value) =>
    String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/gi, 'd')
      .toLowerCase();

  const visibleCards = useMemo(() => {
    const needle = norm(query.trim());
    if (!needle) return sortedCards;
    return sortedCards.filter((card) => {
      const info = CARD_DATA[card.type] || card;
      return [card.nameVN, card.type, info.nameVN, info.badgeText, info.shortTip, info.descriptionVN]
        .some((value) => norm(value).includes(needle));
    });
  }, [sortedCards, query]);

  const handleToggle = (card) => {
    soundEffects.playClick();
    if (onToggle) onToggle(card);
  };

  const handlePlay = () => {
    if (onPlay) onPlay();
  };

  const handleDraw = () => {
    if (onDraw) onDraw();
  };

  const handleSortChange = (mode) => {
    soundEffects.playClick();
    setSortMode(mode);
  };

  return (
    <div data-hand className="flex flex-col items-center gap-2.5 w-full">
      {/* Thanh công cụ: sắp xếp, tìm kiếm và rút bài cùng một hàng */}
      <div className="w-full max-w-4xl flex items-center gap-1.5 px-1 text-xs">
        <label className="flex items-center sm:hidden">
          <select
            value={sortMode}
            onChange={(e) => handleSortChange(e.target.value)}
            aria-label="Sắp xếp bài"
            className="landing-input py-1.5 text-[11px]! font-bold"
            style={{ width: '126px' }}
          >
            <option value="function">⚡ Tính năng</option>
            <option value="combos">🐱 Combo</option>
            <option value="name">🔤 A-Z</option>
          </select>
        </label>

        <div className="hidden sm:flex items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--ink-soft)]">
            Sắp xếp bài
          </span>
          <div className="inline-flex gap-1 rounded-[4px] border-2 border-[var(--ink)] bg-[var(--paper-2)] p-1">
            <button
              type="button"
              onClick={() => handleSortChange('function')}
              className={`landing-tab text-[10px] ${sortMode === 'function' ? 'is-active' : ''}`}
              title="Xếp theo công dụng: Cứu mạng, Chặn đòn, Tấn công, Kiểm soát, Lá mèo"
            >
              ⚡ Tính năng
            </button>

            <button
              type="button"
              onClick={() => handleSortChange('combos')}
              className={`landing-tab text-[10px] ${sortMode === 'combos' ? 'is-active' : ''}`}
              title="Ưu tiên gom các cặp lá giống nhau lên đầu để dễ ghép Combo"
            >
              🐱 Ghép Combo
            </button>

            <button
              type="button"
              onClick={() => handleSortChange('name')}
              className={`landing-tab text-[10px] ${sortMode === 'name' ? 'is-active' : ''}`}
              title="Xếp theo bảng chữ cái A-Z"
            >
              🔤 Tên A-Z
            </button>
          </div>
        </div>

        <label className="relative min-w-0 flex-1 sm:max-w-[230px]">
          <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-sm opacity-60" aria-hidden="true">🔎</span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tìm lá bài..."
            aria-label="Tìm lá bài trong tay"
            className="landing-input w-full py-1.5 pl-7! pr-2! text-[11px]!"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label="Xóa tìm kiếm"
              className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded px-1 text-xs font-black text-[var(--ink-soft)] hover:text-[var(--ink)]"
            >
              ✕
            </button>
          )}
        </label>

        {query && (
          <span className="landing-chip hidden sm:inline-flex">
            {visibleCards.length}/{cards.length} lá
          </span>
        )}

        <button
          onClick={handleDraw}
          disabled={!canAct}
          className={`landing-btn ml-auto shrink-0 ${!canAct ? '' : 'landing-btn--ink'} px-3 py-1.5 text-[10px] sm:text-xs`}
        >
          <span className="sm:hidden">RÚT</span>
          <span className="hidden sm:inline">RÚT BÀI</span>
        </button>
      </div>

      {/* Khay bài: tối đa 2 hàng, cuộn dọc khi nhiều lá */}
      <div className="relative w-full px-1">
        <div className="card-hand-scroll mx-auto grid max-h-[15rem] max-w-4xl grid-cols-4 gap-2 overflow-y-scroll px-1 py-1.5 pr-2 scrollbar-thin sm:flex sm:max-h-[20rem] sm:flex-wrap sm:justify-center sm:gap-2.5">
          {visibleCards.map((card, index) => (
            <div
              key={card.id}
              className={`hand-card-target shrink-0 ${
                selectedIds.includes(card.id) ? 'combo-selected-pulse' : ''
              }`}
              style={{ opacity: active?.phase === 'flight' && active.cards?.some(c => c.id === card.id) ? 0 : 1 }}
            >
              <Card
                card={card}
                layoutScope="hand"
                layoutDelay={Math.min(index, 10) * .04}
                selected={selectedIds.includes(card.id)}
                onClick={() => handleToggle(card)}
                disabled={!!card.disabled}
                size={isMobile || cards.length > 6 ? 'small' : 'normal'}
                highlighted={
                  highlightTypes ? highlightTypes.includes(card.type) : highlightType === card.type
                }
                className="transition-transform"
              />
            </div>
          ))}

          {cards.length === 0 && (
            <div className="col-span-4 flex w-full flex-col items-center justify-center py-6 text-[var(--ink-soft)]">
              <span className="text-3xl mb-1 opacity-50">🐾</span>
              <span className="text-xs font-bold">Không có lá bài nào trên tay</span>
            </div>
          )}
          {cards.length > 0 && visibleCards.length === 0 && (
            <div className="col-span-4 flex w-full flex-col items-center justify-center py-6 text-[var(--ink-soft)]">
              <span className="text-2xl mb-1 opacity-50">🔎</span>
              <span className="text-xs font-bold">Không tìm thấy lá bài phù hợp</span>
            </div>
          )}
        </div>
      </div>

      {/* Khung ghi chú kỹ năng chi tiết của lá bài đang chọn */}
      <CardSkillInspector
        selectedCards={selectedIds}
        cards={cards}
        comboInfo={comboInfo}
        canUseNope={canUseNope}
        onUseNope={onUseNope}
      />

      {/* Cụm nút hành động chính */}
      {!hideActions && (
        <div className="game-action-bar flex gap-3 sm:gap-4 w-full justify-center flex-wrap pt-0.5">
          {/* Nút CHƠI BÀI */}
          <button
            onClick={handlePlay}
            disabled={!canAct || playDisabled}
            className={`landing-btn ${
              !canAct || playDisabled ? '' : 'landing-btn--oxblood'
            } px-6 sm:px-8 py-2.5 text-xs sm:text-sm`}
          >
            {playLabel}
          </button>

          {/* Nút RÚT BÀI */}
          <button
            onClick={handleDraw}
            disabled={!canAct}
            className={`landing-btn ${!canAct ? '' : 'landing-btn--ink'} px-6 sm:px-8 py-2.5 text-xs sm:text-sm`}
          >
            <span>RÚT BÀI &amp; KẾT THÚC</span>
          </button>
        </div>
      )}
    </div>
  );
}

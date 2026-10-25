import { useEffect, useMemo, useState } from 'react';
import Card from './Card';
import CardSkillInspector from './CardSkillInspector';
import { soundEffects } from '../utils/soundEffects';
import { sortCards } from '../utils/cardSorter';

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
}) {
  // Chế độ sắp xếp bài: 'function' (theo tính năng - mặc định) | 'combos' (ưu tiên combo) | 'name' (A-Z)
  const [sortMode, setSortMode] = useState('function');
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

  const handleToggle = (card) => {
    soundEffects.playClick();
    if (onToggle) onToggle(card);
  };

  const handlePlay = () => {
    soundEffects.playCard();
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
    <div className="flex flex-col items-center gap-2.5 w-full">
      {/* Thanh công cụ sắp xếp bài (Sort Bar) */}
      <div className="w-full max-w-4xl flex items-center justify-between gap-2 px-2 text-xs">
        <label className="flex items-center gap-1.5 sm:hidden">
          <span className="landing-overline" aria-hidden="true">Sắp xếp</span>
          <select
            value={sortMode}
            onChange={(e) => handleSortChange(e.target.value)}
            aria-label="Sắp xếp bài"
            className="landing-input py-1.5 text-[11px] font-bold"
            style={{ width: 'auto' }}
          >
            <option value="function">⚡ Tính năng</option>
            <option value="combos">🐱 Ghép Combo</option>
            <option value="name">🔤 Tên A-Z</option>
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

        {cards.length > 6 && (
          <div className="landing-chip hidden sm:inline-flex">
            📋 Đã thu gọn bài ({cards.length} lá)
          </div>
        )}
      </div>

      {/* Khay bài: mobile một hàng cuộn ngang, desktop tự xuống dòng */}
      <div className="relative w-full px-1">
        <div className="pointer-events-none absolute inset-y-1 left-0 z-10 w-5 bg-gradient-to-r from-[var(--paper)] to-transparent sm:hidden" />
        <div className="pointer-events-none absolute inset-y-1 right-0 z-10 w-5 bg-gradient-to-l from-[var(--paper)] to-transparent sm:hidden" />
        <div className="mx-auto flex max-w-4xl snap-x snap-mandatory gap-2 overflow-x-auto px-1 py-1.5 sm:flex-wrap sm:justify-center sm:gap-2.5 sm:overflow-visible">
          {sortedCards.map((card) => (
            <div
              key={card.id}
              className={`shrink-0 snap-start ${
                selectedIds.includes(card.id) ? 'combo-selected-pulse' : ''
              }`}
            >
              <Card
                card={card}
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
            <div className="w-full flex flex-col items-center justify-center py-6 text-[var(--ink-soft)]">
              <span className="text-3xl mb-1 opacity-50">🐾</span>
              <span className="text-xs font-bold">Không có lá bài nào trên tay</span>
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
    </div>
  );
}

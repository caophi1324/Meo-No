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
        <label className="flex items-center gap-1.5 text-slate-400 font-semibold text-[11px] sm:hidden">
          <span aria-hidden="true">🎴</span>
          <select
            value={sortMode}
            onChange={(e) => handleSortChange(e.target.value)}
            aria-label="Sắp xếp bài"
            className="rounded-lg border border-slate-700 bg-slate-900 px-2 py-1.5 text-[11px] font-bold text-slate-200"
          >
            <option value="function">⚡ Tính năng</option>
            <option value="combos">🐱 Ghép Combo</option>
            <option value="name">🔤 Tên A-Z</option>
          </select>
        </label>

        <div className="hidden sm:flex items-center gap-1.5 text-slate-400 font-semibold text-[11px]">
          <span>🎴 Sắp xếp bài:</span>
          <div className="inline-flex rounded-xl p-0.5 bg-slate-900/90 border border-slate-700/80 shadow-inner">
            <button
              type="button"
              onClick={() => handleSortChange('function')}
              className={`px-2.5 py-1 rounded-lg text-[10px] sm:text-[11px] font-bold font-display transition-all cursor-pointer ${
                sortMode === 'function'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Xếp theo công dụng: Cứu mạng, Chặn đòn, Tấn công, Kiểm soát, Lá mèo"
            >
              ⚡ Tính năng
            </button>

            <button
              type="button"
              onClick={() => handleSortChange('combos')}
              className={`px-2.5 py-1 rounded-lg text-[10px] sm:text-[11px] font-bold font-display transition-all cursor-pointer ${
                sortMode === 'combos'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Ưu tiên gom các cặp lá giống nhau lên đầu để dễ ghép Combo"
            >
              🐱 Ghép Combo
            </button>

            <button
              type="button"
              onClick={() => handleSortChange('name')}
              className={`px-2.5 py-1 rounded-lg text-[10px] sm:text-[11px] font-bold font-display transition-all cursor-pointer ${
                sortMode === 'name'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Xếp theo bảng chữ cái A-Z"
            >
              🔤 Tên A-Z
            </button>
          </div>
        </div>

        {cards.length > 6 && (
          <div className="hidden sm:block text-[10px] text-amber-400 font-medium bg-amber-950/60 border border-amber-800/40 px-2 py-0.5 rounded-full">
            📋 Đã thu gọn bài ({cards.length} lá)
          </div>
        )}
      </div>

      {/* Khay bài: mobile một hàng cuộn ngang, desktop tự xuống dòng */}
      <div className="relative w-full px-1">
        <div className="pointer-events-none absolute inset-y-1 left-0 z-10 w-5 bg-gradient-to-r from-slate-950 to-transparent sm:hidden" />
        <div className="pointer-events-none absolute inset-y-1 right-0 z-10 w-5 bg-gradient-to-l from-slate-950 to-transparent sm:hidden" />
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
            <div className="w-full flex flex-col items-center justify-center py-6 text-slate-500">
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
          className={`relative px-6 sm:px-8 py-2.5 rounded-2xl font-black text-xs sm:text-sm font-display transition-all duration-200 select-none shadow-lg active:scale-95 ${
            !canAct || playDisabled
              ? 'bg-slate-800 text-slate-500 border border-slate-700/60 cursor-not-allowed shadow-none'
              : 'bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 text-white shadow-orange-500/40 hover:shadow-orange-500/60 hover:-translate-y-0.5 border-t border-amber-300 cursor-pointer animate-pulse'
          }`}
        >
          {playLabel}
        </button>

        {/* Nút RÚT BÀI */}
        <button
          onClick={handleDraw}
          disabled={!canAct}
          className={`relative px-6 sm:px-8 py-2.5 rounded-2xl font-black text-xs sm:text-sm font-display transition-all duration-200 select-none shadow-lg active:scale-95 flex items-center gap-2 ${
            !canAct
              ? 'bg-slate-800 text-slate-500 border border-slate-700/60 cursor-not-allowed shadow-none'
              : 'bg-gradient-to-r from-slate-700 to-slate-800 hover:from-sky-600 hover:to-indigo-600 text-white shadow-slate-900/60 hover:shadow-sky-500/30 hover:-translate-y-0.5 border border-slate-600 hover:border-sky-400 cursor-pointer'
          }`}
        >
          <span>🂠</span>
          <span>RÚT BÀI & KẾT THÚC</span>
        </button>
      </div>
    </div>
  );
}

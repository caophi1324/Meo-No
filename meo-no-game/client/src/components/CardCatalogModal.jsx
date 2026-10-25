import { useState } from 'react';
import ModalShell from './ModalShell';
import CustomCard from './CustomCard';
import { CUSTOM_CARD_LIST } from '../data/customCards';

export default function CardCatalogModal({ onClose }) {
  const [selectedId, setSelectedId] = useState(CUSTOM_CARD_LIST[0]?.id);
  const selected = CUSTOM_CARD_LIST.find((card) => card.id === selectedId);

  return (
    <ModalShell
      label="Bộ bài custom"
      onClose={onClose}
      overlayClassName="bg-[#0B1410]/85 backdrop-blur-[2px]"
      panelClassName="paper-modal flex max-h-[92vh] w-full max-w-6xl flex-col"
    >
      <div className="flex shrink-0 items-center justify-between gap-3 border-b-2 border-[var(--ink)] bg-[var(--paper-2)] px-5 py-4">
        <div>
          <span className="landing-stamp">Danh mục</span>
          <h2 className="mt-3 font-display text-2xl font-bold leading-tight text-[var(--ink)]">
            Bộ bài custom
          </h2>
          <p className="mt-1 text-xs font-semibold text-[var(--ink-soft)]">
            {CUSTOM_CARD_LIST.length} lá · bấm một lá để đọc hiệu ứng
          </p>
        </div>
        <button type="button" onClick={onClose} aria-label="Đóng bộ bài" className="landing-icon-btn shrink-0">
          ✕
        </button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <div className="min-h-0 flex-1 overflow-y-auto bg-[var(--paper)] p-4">
          <div className="grid grid-cols-5 gap-2 sm:grid-cols-8 lg:grid-cols-10">
            {CUSTOM_CARD_LIST.map((card) => (
              <CustomCard
                key={card.id}
                card={card}
                size="small"
                selected={card.id === selectedId}
                onClick={() => setSelectedId(card.id)}
              />
            ))}
          </div>
        </div>

        {selected && (
          <aside className="paper-index-card shrink-0 border-t-2 border-[var(--ink)] p-4 lg:w-80 lg:border-l-2 lg:border-t-0">
            <div className="flex gap-3">
              <CustomCard card={selected} size="small" />
              <div className="min-w-0">
                <div className="landing-overline">{selected.category}</div>
                <h3 className="mt-1 font-display text-xl font-bold leading-tight text-[var(--ink)]">
                  {selected.name}
                </h3>
                {selected.multiplier && (
                  <span className="landing-chip mt-1.5">{selected.multiplier}</span>
                )}
                {selected.subtitle && (
                  <p className="mt-1.5 text-[10px] italic leading-snug text-[var(--ink-soft)]">
                    {selected.subtitle}
                  </p>
                )}
              </div>
            </div>

            <div className="mt-4 border-t-2 border-[var(--ink)] pt-3">
              <div className="landing-overline">Hiệu ứng</div>
              <p className="mt-1.5 whitespace-pre-line text-sm leading-relaxed text-[var(--ink)]">
                {selected.effect}
              </p>
            </div>

            <p className="mt-4 text-[10px] font-semibold text-[var(--ink-soft)]">
              Mã thẻ {selected.id} · Bộ custom
            </p>
          </aside>
        )}
      </div>
    </ModalShell>
  );
}

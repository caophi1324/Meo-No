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
      overlayClassName="bg-black/90 backdrop-blur-sm"
      panelClassName="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-3xl border-2 border-amber-400/60 bg-gradient-to-b from-slate-800 via-slate-900 to-slate-950 shadow-2xl"
    >
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-700 px-5 py-4">
        <div>
          <h2 className="font-display text-xl font-black text-white">🃏 Bộ bài custom</h2>
          <p className="text-xs text-slate-400">
            {CUSTOM_CARD_LIST.length} lá · bấm một lá để xem nội dung
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Đóng bộ bài"
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white"
        >
          ✕
        </button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <div className="min-h-0 flex-1 overflow-y-auto p-4">
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
          <aside className="shrink-0 border-t border-slate-700 bg-slate-950/60 p-4 lg:w-80 lg:border-l lg:border-t-0">
            <div className="flex gap-3">
              <CustomCard card={selected} size="small" />
              <div className="min-w-0">
                <h3 className="font-display text-lg font-black text-white">{selected.name}</h3>
                <div className="mt-1 text-[10px] font-bold uppercase tracking-wider text-amber-300">
                  {selected.category}
                  {selected.multiplier ? ` · ${selected.multiplier}` : ''}
                </div>
                {selected.subtitle && (
                  <p className="mt-1 text-[10px] text-slate-500">{selected.subtitle}</p>
                )}
              </div>
            </div>
            <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-slate-300">
              {selected.effect}
            </p>
            <p className="mt-4 text-[10px] text-slate-500">
              Mã: {selected.id} · Nguồn ảnh: {selected.id}
            </p>
          </aside>
        )}
      </div>
    </ModalShell>
  );
}

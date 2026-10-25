import { useEffect, useState } from 'react';
import useGameStore from '../store/gameStore';
import { soundEffects } from '../utils/soundEffects';

const DEFAULTS = {
  turnTimeLimit: 60,
  nopeWindowTime: 5,
  alterFutureTime: 30,
};

const FIELDS = [
  { key: 'turnTimeLimit', label: 'Lượt' },
  { key: 'nopeWindowTime', label: 'Phủ Nhận' },
  { key: 'alterFutureTime', label: 'Tương lai' },
];

export default function TimerSettings({ values, onApply, applyLabel = 'Áp dụng', tone = 'dark' }) {
  const [draft, setDraft] = useState(() => ({ ...DEFAULTS, ...values }));
  const paper = tone === 'paper';

  useEffect(() => {
    setDraft({ ...DEFAULTS, ...values });
  }, [values?.turnTimeLimit, values?.nopeWindowTime, values?.alterFutureTime]);

  const update = (key, value) => {
    setDraft((current) => ({ ...current, [key]: value }));
  };

  const apply = () => {
    const next = {};
    for (const field of FIELDS) {
      const seconds = Math.round(Number(draft[field.key]));
      if (!Number.isFinite(seconds) || seconds < 1) {
        useGameStore.getState().pushToast(`⚠️ ${field.label} phải từ 1 giây trở lên!`);
        return;
      }
      next[field.key] = seconds;
    }
    soundEffects.playClick();
    onApply(next);
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {FIELDS.map((field) => (
          <label
            key={field.key}
            className={
              paper
                ? 'rounded border-2 border-[var(--ink)] bg-[var(--paper)] px-3 py-2'
                : 'rounded-xl border border-slate-700 bg-slate-800/80 px-3 py-2'
            }
          >
            <span
              className={
                paper
                  ? 'block text-[10px] font-bold uppercase tracking-wide text-[var(--ink-soft)]'
                  : 'block text-[10px] font-bold uppercase tracking-wide text-slate-400'
              }
            >
              {field.label}
            </span>
            <span className="mt-1 flex items-center gap-1.5">
              <input
                type="number"
                min="1"
                step="1"
                value={draft[field.key]}
                onChange={(e) => update(field.key, e.target.value)}
                className={
                  paper
                    ? 'min-w-0 flex-1 bg-transparent text-sm font-black text-[var(--ink)] outline-none'
                    : 'min-w-0 flex-1 bg-transparent text-sm font-black text-white outline-none'
                }
              />
              <span
                className={
                  paper
                    ? 'text-[10px] font-bold text-[var(--ink-soft)]'
                    : 'text-[10px] font-bold text-slate-500'
                }
              >
                giây
              </span>
            </span>
            <span
              className={
                paper
                  ? 'mt-0.5 block text-[9px] text-[var(--ink-soft)]'
                  : 'mt-0.5 block text-[9px] text-slate-500'
              }
            >
              tối thiểu 1s
            </span>
          </label>
        ))}
      </div>

      <div className="flex items-center justify-between gap-3">
        <p
          className={
            paper
              ? 'text-[10px] leading-snug text-[var(--ink-soft)]'
              : 'text-[10px] leading-snug text-slate-500'
          }
        >
          Nope/Tương lai áp dụng ngay nếu cửa sổ đang mở.
        </p>
        <button
          type="button"
          onClick={apply}
          className={
            paper
              ? 'landing-btn landing-btn--mustard shrink-0 px-4 py-2 text-xs'
              : 'shrink-0 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 px-4 py-2 text-xs font-black text-white shadow-lg shadow-orange-600/20 transition-all hover:from-amber-400 hover:to-orange-500 active:scale-95'
          }
        >
          {applyLabel}
        </button>
      </div>
    </div>
  );
}

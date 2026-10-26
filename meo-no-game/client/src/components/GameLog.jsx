import { useEffect, useRef, useState } from 'react';

const ATTACK_KINDS = new Set(['attack', 'nope', 'steal', 'favor', 'reaction', 'destroy', 'disable']);
const BOOM_KINDS = new Set(['explosion', 'imploding', 'boom']);
const FILTERS = [
  ['all', 'Tất cả'],
  ['mine', 'Của tôi'],
  ['attack', 'Tấn công'],
  ['boom', 'Nổ'],
];

function timeOf(ts) {
  if (!ts) return '--:--:--';
  return new Date(ts).toLocaleTimeString('vi-VN', { hour12: false });
}

export default function GameLog({
  logs = [],
  compact = false,
  fill = false,
  playerName = '',
  onReplayCards,
}) {
  const ref = useRef(null);
  const stickRef = useRef(true);
  const [filter, setFilter] = useState('all');

  const visible = logs.filter((entry) => {
    if (filter === 'mine') {
      return !!entry.private || (playerName && String(entry.text || '').includes(playerName));
    }
    if (filter === 'attack') return ATTACK_KINDS.has(entry.kind);
    if (filter === 'boom') return BOOM_KINDS.has(entry.kind);
    return true;
  });

  const lastId = logs[logs.length - 1]?.id;

  useEffect(() => {
    const el = ref.current;
    if (!el || !stickRef.current) return;
    el.scrollTop = el.scrollHeight;
  }, [lastId, filter]);

  const onScroll = () => {
    const el = ref.current;
    if (!el) return;
    stickRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 24;
  };

  return (
    <div className="flex h-full min-h-0 flex-col gap-1.5">
      <div className="flex shrink-0 flex-wrap items-center gap-1 px-1">
        {FILTERS.map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setFilter(id)}
            aria-pressed={filter === id}
            className={`landing-tab px-2 py-1 text-[9px] ${filter === id ? 'is-active' : ''}`}
          >
            {label}
          </button>
        ))}
      </div>

      <div
        ref={ref}
        onScroll={onScroll}
        className={`min-h-0 overflow-x-hidden overflow-y-auto space-y-1.5 scrollbar-thin pr-1 ${
          fill ? 'h-full' : compact ? 'max-h-24' : 'max-h-36'
        }`}
      >
        {visible.map((entry) => {
          const text = entry.text || '';
          const mine = entry.private || (playerName && text.includes(playerName));
          const isExplosion = entry.kind === 'explosion' || text.includes('💥');
          const isBoom = BOOM_KINDS.has(entry.kind) || isExplosion;
          const isAttack = ATTACK_KINDS.has(entry.kind);
          const isDefuse = entry.kind === 'defuse';

          return (
            <div
              key={entry.id}
              className={`text-xs px-2.5 py-1.5 rounded-[3px] border-l-4 transition-colors ${
                entry.private
                  ? 'bg-[#F5E7C8] border-[var(--mustard)] text-[var(--ink)]'
                  : isBoom
                    ? 'bg-[#F3D8D2] border-[var(--oxblood)] text-[var(--oxblood)] font-bold'
                    : isDefuse
                      ? 'bg-[#DDE9DD] border-[var(--felt)] text-[#1F4D3A] font-semibold'
                      : isAttack
                        ? 'bg-[#F5E7C8] border-[var(--mustard)] text-[#7B4B14] font-semibold'
                        : mine
                          ? 'bg-[#FBF1E4] border-[var(--oxblood)] text-[var(--ink)]'
                          : 'bg-[var(--paper-2)]/60 border-[var(--line)] text-[var(--ink-soft)]'
              }`}
            >
              <div className="flex items-start gap-1.5">
                <span className="shrink-0 pt-0.5 font-mono text-[9px] tabular-nums opacity-60">
                  {timeOf(entry.ts)}
                </span>
                <span className="min-w-0 flex-1 break-words leading-relaxed">{text}</span>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                {entry.private && (
                  <span className="rounded-[2px] border border-[var(--oxblood)] px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wider text-[var(--oxblood)]">
                    Riêng tư
                  </span>
                )}
                {entry.cards?.length > 0 && onReplayCards && (
                  <button
                    type="button"
                    onClick={() => onReplayCards(entry)}
                    className="landing-tab px-1.5 py-0.5 text-[9px]"
                  >
                    Xem lại
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {visible.length === 0 && (
          <div className="text-xs text-[var(--ink-soft)] italic py-2 text-center">
            {logs.length === 0 ? 'Ván đấu vừa khởi động...' : 'Không có dòng nào trong mục này.'}
          </div>
        )}
      </div>
    </div>
  );
}

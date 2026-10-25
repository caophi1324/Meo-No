import { useEffect, useRef } from 'react';

export default function GameLog({ logs = [], compact = false, fill = false }) {
  const ref = useRef(null);

  useEffect(() => {
    if (ref.current) {
      ref.current.scrollTop = ref.current.scrollHeight;
    }
  }, [logs.length]);

  return (
    <div
      ref={ref}
      className={`overflow-y-auto space-y-1.5 scrollbar-thin scrollbar-thumb-slate-700 pr-1 ${
        fill ? 'h-full' : compact ? 'max-h-24' : 'max-h-36'
      }`}
    >
      {logs.map((log, i) => {
        const isExplosion = log.includes('💥') || log.includes('nổ');
        const isDefuse = log.includes('🔧') || log.includes('Gỡ Bom');
        const isAttack = log.includes('⚔️') || log.includes('Tấn Công');
        const isNope = log.includes('🚫') || log.includes('Phủ Nhận');

        return (
          <div
            key={i}
            className={`text-xs px-2.5 py-1.5 rounded-[3px] flex items-center gap-1.5 border-l-4 transition-colors ${
              isExplosion
                ? 'bg-[#F3D8D2] border-[var(--oxblood)] text-[var(--oxblood)] font-bold'
                : isDefuse
                  ? 'bg-[#DDE9DD] border-[var(--felt)] text-[#1F4D3A] font-semibold'
                  : isAttack
                    ? 'bg-[#F5E7C8] border-[var(--mustard)] text-[#7B4B14] font-semibold'
                    : isNope
                      ? 'bg-[#F3D8D2] border-[var(--oxblood)] text-[var(--oxblood)]'
                      : 'bg-[var(--paper-2)]/60 border-[var(--line)] text-[var(--ink-soft)]'
            }`}
          >
            <span className="leading-relaxed">{log}</span>
          </div>
        );
      })}
      {logs.length === 0 && (
        <div className="text-xs text-[var(--ink-soft)] italic py-2 text-center">
          Ván đấu vừa khởi động...
        </div>
      )}
    </div>
  );
}

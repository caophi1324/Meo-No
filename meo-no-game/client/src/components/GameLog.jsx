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
            className={`text-xs px-2.5 py-1 rounded-lg flex items-center gap-1.5 transition-colors ${
              isExplosion
                ? 'bg-red-950/70 border border-red-700/60 text-red-200 font-bold'
                : isDefuse
                  ? 'bg-emerald-950/60 border border-emerald-700/50 text-emerald-200 font-semibold'
                  : isAttack
                    ? 'bg-orange-950/60 border border-orange-700/50 text-orange-200 font-semibold'
                    : isNope
                      ? 'bg-rose-950/60 border border-rose-700/50 text-rose-200'
                      : 'bg-slate-900/60 border border-slate-800 text-slate-300'
            }`}
          >
            <span className="leading-relaxed">{log}</span>
          </div>
        );
      })}
      {logs.length === 0 && (
        <div className="text-xs text-slate-500 italic py-2 text-center">
          Ván đấu vừa khởi động...
        </div>
      )}
    </div>
  );
}

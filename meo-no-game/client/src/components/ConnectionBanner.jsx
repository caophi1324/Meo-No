import useGameStore from '../store/gameStore';

export default function ConnectionBanner() {
  const connectionLost = useGameStore((s) => s.connectionLost);
  if (!connectionLost) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed left-1/2 top-2 z-[80] -translate-x-1/2 rounded-xl border border-amber-400/70 bg-amber-950/95 px-4 py-2 text-xs font-black text-amber-100 shadow-2xl shadow-black/50"
    >
      ⚠️ Mất kết nối — đang thử kết nối lại…
    </div>
  );
}

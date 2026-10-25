import useGameStore from '../store/gameStore';

export default function Toasts() {
  const toasts = useGameStore((s) => s.toasts);
  const removeToast = useGameStore((s) => s.removeToast);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-[4.5rem] left-1/2 z-[70] w-max max-w-[92vw] -translate-x-1/2 space-y-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          onClick={() => removeToast(t.id)}
          className="cursor-pointer bg-slate-800/95 border border-orange-500/60 text-white text-sm px-4 py-2.5 rounded-xl shadow-2xl animate-pulse-none"
        >
          {t.message}
        </div>
      ))}
    </div>
  );
}

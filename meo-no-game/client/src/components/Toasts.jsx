import useGameStore from '../store/gameStore';

export default function Toasts() {
  const toasts = useGameStore((s) => s.toasts);
  const removeToast = useGameStore((s) => s.removeToast);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-24 left-3 z-[70] w-max max-w-[92vw] space-y-2 sm:bottom-4 sm:left-4">
      {toasts.map((t) => (
        <div
          key={t.id}
          onClick={() => removeToast(t.id)}
          className="cursor-pointer rounded-[4px] border-2 border-[#1F1A14] bg-[#F4EAD5] px-4 py-2.5 text-sm font-semibold text-[#1F1A14] shadow-[3px_3px_0_#1F1A14]"
        >
          {t.message}
        </div>
      ))}
    </div>
  );
}

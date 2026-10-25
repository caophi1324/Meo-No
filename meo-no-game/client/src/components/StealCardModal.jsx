import ModalShell from './ModalShell';
import Card from './Card';
import { soundEffects } from '../utils/soundEffects';

export default function StealCardModal({
  mode = 'target',
  title = '',
  targets = [],
  discardCards = [],
  cardCount = 0,
  targetName = '',
  secondsLeft = null,
  onPickTarget,
  onPickCard,
  onPickIndex,
  onClose,
}) {
  const handleTarget = (id) => {
    soundEffects.playCard();
    if (onPickTarget) onPickTarget(id);
  };

  const handleCard = (id) => {
    soundEffects.playCard();
    if (onPickCard) onPickCard(id);
  };

  return (
    <ModalShell
      label={title || 'Cướp bài'}
      onClose={onClose}
      overlayClassName="bg-black/85 backdrop-blur-sm animate-in fade-in duration-200"
      panelClassName="bg-gradient-to-b from-slate-800 via-slate-900 to-slate-950 rounded-3xl p-6 border-2 border-amber-400 max-w-lg w-full shadow-2xl shadow-amber-500/20 relative overflow-hidden"
    >
        {/* Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-20 bg-amber-500/20 rounded-full blur-2xl pointer-events-none" />

        <h2 className="text-xl sm:text-2xl font-black text-white mb-2 text-center font-display tracking-wide">
          {title || '🐱 CƯỚP BÀI'}
        </h2>
        <p className="text-xs text-slate-400 text-center mb-4">
          {mode === 'discard'
            ? 'Chọn 1 lá bài bất kỳ từ chồng bài đã hạ để thêm vào tay:'
            : mode === 'cards'
              ? `Chọn 1 trong ${cardCount} lá úp của ${targetName || 'đối thủ'}:`
              : 'Chọn người chơi mà bạn muốn nhắm đến:'}
        </p>
        {secondsLeft !== null && (
          <p className="mb-3 text-[11px] font-black text-amber-300 text-center" aria-live="polite">
            ⏳ Hết giờ sẽ tự động rút bài ({secondsLeft}s)
          </p>
        )}

        {mode === 'target' && (
          <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-700">
            {targets.map((t) => (
              <button
                key={t.id}
                onClick={() => handleTarget(t.id)}
                className="w-full flex items-center justify-between px-4 py-3 bg-slate-800/90 hover:bg-amber-600/30 border border-slate-700 hover:border-amber-400 rounded-2xl text-white transition-all shadow cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-slate-700 flex items-center justify-center text-xl group-hover:scale-110 transition-transform">
                    {t.isBot ? '🤖' : '🐱'}
                  </div>
                  <span className="font-bold text-sm sm:text-base font-display">{t.name}</span>
                </div>
                <div className="px-2.5 py-1 rounded-full bg-slate-950/80 border border-slate-700 text-xs text-amber-300 font-semibold font-display">
                  {t.cardCount} lá trên tay
                </div>
              </button>
            ))}
            {targets.length === 0 && (
              <div className="text-slate-400 text-sm text-center py-6">
                Không có đối thủ hợp lệ nào còn bài
              </div>
            )}
          </div>
        )}

        {mode === 'cards' && (
          <div className="flex flex-wrap gap-2.5 justify-center max-h-80 overflow-y-auto p-1">
            {Array.from({ length: cardCount }, (_, index) => (
              <div key={index} className="flex flex-col items-center gap-1">
                <Card
                  card={{ id: `hidden-${index}`, type: 'hidden' }}
                  faceDown
                  size="small"
                  onClick={() => {
                    soundEffects.playCard();
                    if (onPickIndex) onPickIndex(index);
                  }}
                />
                <span className="text-[10px] font-bold text-slate-400">Lá {index + 1}</span>
              </div>
            ))}
          </div>
        )}

        {mode === 'discard' && (
          <div className="flex gap-2.5 overflow-x-auto pb-3 pt-1 justify-start sm:justify-center flex-wrap max-h-80 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700">
            {discardCards.map((card) => (
              <div key={card.id} className="hover:scale-105 transition-transform">
                <Card card={card} size="small" onClick={() => handleCard(card.id)} />
              </div>
            ))}
            {discardCards.length === 0 && (
              <div className="text-slate-400 text-sm py-8 text-center w-full">
                Chồng bài hạ hiện đang trống
              </div>
            )}
          </div>
        )}

        {onClose && (
          <div className="mt-5 text-center">
            <button
              onClick={() => {
                soundEffects.playClick();
                onClose();
              }}
              className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold text-sm transition-all border border-slate-700 cursor-pointer"
            >
              Hủy bỏ
            </button>
          </div>
        )}
    </ModalShell>
  );
}

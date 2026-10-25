import { useEffect, useState } from 'react';
import ModalShell from './ModalShell';
import { soundEffects } from '../utils/soundEffects';

export default function DefuseModal({ max = 0, mode = 'defuse', secondsLeft = null, onPlace, onClose }) {
  const upper = Math.max(1, max + 1);
  const isImploding = mode === 'imploding';
  const [position, setPosition] = useState(1);

  useEffect(() => {
    setPosition((p) => Math.min(Math.max(1, p), upper));
  }, [upper]);

  useEffect(() => {
    if (isImploding) soundEffects.playDraw();
    else soundEffects.playDefuse();
  }, [isImploding]);

  const handleSelect = (pos) => {
    soundEffects.playClick();
    setPosition(pos);
  };

  const handleConfirm = () => {
    soundEffects.playCard();
    onPlace(position - 1);
  };

  return (
    <ModalShell
      label={isImploding ? 'Đặt Imploding Kitten' : 'Gỡ bom'}
      onClose={onClose}
      overlayClassName="bg-black/85 backdrop-blur-sm animate-in fade-in duration-200"
      panelClassName="paper-modal max-w-md w-full p-6 text-center sm:p-7"
    >
        {/* Header */}
        <div className={`w-16 h-16 mx-auto mb-3 rounded-[4px] border-2 flex items-center justify-center shadow-[3px_3px_0_var(--hard-shadow)] ${
        isImploding ? 'bg-[#DDE7EC] border-[#1F5A7A]' : 'bg-[#DDE9DD] border-[var(--felt)]'
      }`}>
          <img
            src={isImploding ? '/cards/custom/MN001.jpg' : '/cards/defuse.svg'}
            alt={isImploding ? 'Imploding Kitten' : 'Gỡ bom'}
            className="w-12 h-12 object-contain rounded-[2px]"
          />
        </div>

        <h2 className="text-xl sm:text-2xl font-black text-[var(--ink)] mb-1 font-display tracking-wide">
          {isImploding ? '💣 IMPLODING KITTEN LẬT NGỬA!' : '🔧 GỠ BOM THÀNH CÔNG!'}
        </h2>
        <p className={`text-xs sm:text-sm mb-4 ${isImploding ? 'text-[#1F5A7A]' : 'text-[var(--felt)]'}`}>
          {isImploding
            ? 'Bạn vừa lật ngửa lá bài. Chọn vị trí đặt nó trở lại chồng bài:'
            : 'Hãy bí mật chọn vị trí nhét lá Mèo Nổ trở lại chồng bài:'}
        </p>
        {secondsLeft !== null && (
          <p className="mb-4 text-[11px] font-black text-[var(--oxblood)]" aria-live="polite">
            ⏳ Tự động đặt ngẫu nhiên sau {secondsLeft}s
          </p>
        )}

        {/* Các nút vị trí nhanh (Presets) */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          <button
            type="button"
            onClick={() => handleSelect(1)}
            className={`landing-tab text-xs ${position === 1 ? 'is-active' : ''}`}
          >
            <span>🔝 Trên cùng (1)</span>
          </button>

          <button
            type="button"
            onClick={() => handleSelect(Math.min(2, upper))}
            className={`landing-tab text-xs ${position === 2 ? 'is-active' : ''}`}
          >
            <span>🎯 Vị trí số 2</span>
          </button>

          <button
            type="button"
            onClick={() => handleSelect(Math.floor(Math.random() * upper) + 1)}
            className="landing-tab text-xs"
          >
            <span>🎲 Ngẫu nhiên</span>
          </button>

          <button
            type="button"
            onClick={() => handleSelect(upper)}
            className={`landing-tab text-xs ${position === upper ? 'is-active' : ''}`}
          >
            <span>🔻 Đáy chồng bài ({upper})</span>
          </button>
        </div>

        {/* Thanh trượt vị trí trực quan */}
        <div className="paper-panel paper-panel--soft mb-5 p-4">
          <div className="flex justify-between text-xs text-[var(--ink-soft)] mb-2 font-medium">
            <span>Trên cùng (1)</span>
            <span className="font-bold text-[var(--oxblood)] text-sm">Vị trí: {position}</span>
            <span>Đáy ({upper})</span>
          </div>

          <input
            type="range"
            min="1"
            max={upper}
            value={position}
            onChange={(e) => setPosition(parseInt(e.target.value) || 1)}
            className="w-full accent-[var(--oxblood)] cursor-pointer h-2 bg-[var(--paper)] rounded-lg"
          />

          <div className="text-[11px] text-[var(--ink-soft)] mt-2">
            {position === 1 ? (
              <span className="text-[var(--oxblood)] font-bold">⚠️ Người tiếp theo rút bài sẽ dính bom ngay!</span>
            ) : position === upper ? (
              <span className="text-[var(--felt)] font-semibold">Lá bom nằm dưới đáy, an toàn cho lượt này.</span>
            ) : (
              <span>Lá bom sẽ nằm ở vị trí thứ {position} từ trên xuống.</span>
            )}
          </div>
        </div>

        {/* Nút hành động */}
        <div className="flex gap-3">
          <button
            onClick={handleConfirm}
            className="landing-btn landing-btn--oxblood flex-1 py-3 text-sm sm:text-base"
          >
            {isImploding ? '✅ XÁC NHẬN ĐẶT BÀI' : '✅ XÁC NHẬN NHÉT BÀI'}
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="landing-btn landing-btn--paper px-4 py-3 text-xs"
            >
              Để sau
            </button>
          )}
        </div>
    </ModalShell>
  );
}

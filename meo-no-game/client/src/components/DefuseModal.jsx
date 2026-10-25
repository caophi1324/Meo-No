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
      panelClassName="bg-gradient-to-b from-slate-800 via-slate-900 to-slate-950 rounded-3xl p-6 sm:p-7 border-2 border-emerald-500 max-w-md w-full text-center shadow-2xl shadow-emerald-500/20 relative overflow-hidden"
    >
        {/* Glow hiệu ứng thành công */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-20 bg-emerald-500/20 rounded-full blur-2xl pointer-events-none" />

        {/* Header */}
        <div className={`w-16 h-16 mx-auto mb-3 rounded-2xl border-2 flex items-center justify-center shadow-lg ${
        isImploding ? 'bg-sky-500/10 border-sky-400' : 'bg-emerald-500/10 border-emerald-400'
      }`}>
          <img
            src={isImploding ? '/cards/custom/MN001.jpg' : '/cards/defuse.svg'}
            alt={isImploding ? 'Imploding Kitten' : 'Gỡ bom'}
            className="w-12 h-12 object-contain rounded"
          />
        </div>

        <h2 className="text-xl sm:text-2xl font-black text-white mb-1 font-display tracking-wide">
          {isImploding ? '💣 IMPLODING KITTEN LẬT NGỬA!' : '🔧 GỠ BOM THÀNH CÔNG!'}
        </h2>
        <p className={`text-xs sm:text-sm mb-4 ${isImploding ? 'text-sky-300/90' : 'text-emerald-300/90'}`}>
          {isImploding
            ? 'Bạn vừa lật ngửa lá bài. Chọn vị trí đặt nó trở lại chồng bài:'
            : 'Hãy bí mật chọn vị trí nhét lá Mèo Nổ trở lại chồng bài:'}
        </p>
        {secondsLeft !== null && (
          <p className="mb-4 text-[11px] font-black text-amber-300" aria-live="polite">
            ⏳ Tự động đặt ngẫu nhiên sau {secondsLeft}s
          </p>
        )}

        {/* Các nút vị trí nhanh (Presets) */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          <button
            type="button"
            onClick={() => handleSelect(1)}
            className={`py-2 px-3 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1.5 border ${
              position === 1
                ? 'bg-red-600 text-white border-red-400 shadow-md shadow-red-600/30'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
            }`}
          >
            <span>🔝 Trên cùng (1)</span>
          </button>

          <button
            type="button"
            onClick={() => handleSelect(Math.min(2, upper))}
            className={`py-2 px-3 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1.5 border ${
              position === 2
                ? 'bg-amber-600 text-white border-amber-400 shadow-md shadow-amber-600/30'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
            }`}
          >
            <span>🎯 Vị trí số 2</span>
          </button>

          <button
            type="button"
            onClick={() => handleSelect(Math.floor(Math.random() * upper) + 1)}
            className="py-2 px-3 rounded-xl font-bold text-xs bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700 transition-all flex items-center justify-center gap-1.5"
          >
            <span>🎲 Ngẫu nhiên</span>
          </button>

          <button
            type="button"
            onClick={() => handleSelect(upper)}
            className={`py-2 px-3 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1.5 border ${
              position === upper
                ? 'bg-emerald-600 text-white border-emerald-400 shadow-md shadow-emerald-600/30'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
            }`}
          >
            <span>🔻 Đáy chồng bài ({upper})</span>
          </button>
        </div>

        {/* Thanh trượt vị trí trực quan */}
        <div className="bg-slate-900/90 rounded-2xl p-4 border border-slate-700/80 mb-5">
          <div className="flex justify-between text-xs text-slate-400 mb-2 font-medium">
            <span>Trên cùng (1)</span>
            <span className="font-bold text-emerald-400 text-sm">Vị trí: {position}</span>
            <span>Đáy ({upper})</span>
          </div>

          <input
            type="range"
            min="1"
            max={upper}
            value={position}
            onChange={(e) => setPosition(parseInt(e.target.value) || 1)}
            className="w-full accent-emerald-500 cursor-pointer h-2 bg-slate-700 rounded-lg"
          />

          <div className="text-[11px] text-slate-400 mt-2">
            {position === 1 ? (
              <span className="text-red-400 font-bold">⚠️ Người tiếp theo rút bài sẽ dính bom ngay!</span>
            ) : position === upper ? (
              <span className="text-emerald-400 font-semibold">Lá bom nằm dưới đáy, an toàn cho lượt này.</span>
            ) : (
              <span>Lá bom sẽ nằm ở vị trí thứ {position} từ trên xuống.</span>
            )}
          </div>
        </div>

        {/* Nút hành động */}
        <div className="flex gap-3">
          <button
            onClick={handleConfirm}
            className={`flex-1 py-3 text-white rounded-xl font-black text-sm sm:text-base font-display transition-all shadow-lg cursor-pointer ${
              isImploding
                ? 'bg-gradient-to-r from-sky-600 to-cyan-700 hover:from-sky-500 hover:to-cyan-600 shadow-sky-600/30'
                : 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 shadow-emerald-600/30'
            }`}
          >
            {isImploding ? '✅ XÁC NHẬN ĐẶT BÀI' : '✅ XÁC NHẬN NHÉT BÀI'}
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold text-xs transition-all border border-slate-700 cursor-pointer"
            >
              Để sau
            </button>
          )}
        </div>
    </ModalShell>
  );
}

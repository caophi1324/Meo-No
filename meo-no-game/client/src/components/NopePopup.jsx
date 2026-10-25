import { useEffect } from 'react';
import { soundEffects } from '../utils/soundEffects';

const ACTION_LABELS = {
  attack: 'Tấn Công',
  skip: 'Bỏ Lượt',
  favor: 'Xin Bài',
  shuffle: 'Xáo Trộn',
  see_the_future: 'Nhìn Tương Lai',
  reverse: 'Đảo Chiều',
  reverse_alt: 'Hoán Đổi',
  steal_card: 'Trộm Bài',
  boom_atomic: 'Boom Nguyên Tử',
  imploding_flipped: 'Imploding Kitten',
  super_skip: 'Siêu Bỏ Lượt',
  alter_future: 'Kiến Tạo Tương Lai',
  fuel: 'Nạp Nhiên Liệu',
  super_destroy: 'Siêu Hủy Bài',
  cat_combo: 'Combo Mèo',
  defuse: 'Gỡ Bom',
};

export default function NopePopup({
  info,
  countdown = 5,
  total = 5,
  canNope = true,
  nopeCards = [],
  onNope,
  onPass,
}) {
  useEffect(() => {
    soundEffects.playNope();
  }, [info]);

  if (!info) return null;
  const pct = Math.max(0, Math.min(100, (countdown / Math.max(1, total)) * 100));
  const label = info.comboSize
    ? `Combo ${info.comboSize} lá`
    : ACTION_LABELS[info.action] || 'một hành động';

  const handleNope = () => {
    soundEffects.playCard();
    if (onNope) onNope();
  };

  const handlePass = () => {
    soundEffects.playClick();
    if (onPass) onPass();
  };

  return (
    <div
      role="alertdialog"
      aria-label="Cửa sổ Phủ Nhận"
      aria-live="assertive"
      className="fixed left-1/2 top-4 z-50 w-[94%] max-w-lg -translate-x-1/2"
    >
      <div className="paper-panel relative overflow-hidden border-[var(--oxblood)] p-4 text-center sm:p-5">
        <div className="mb-2 flex justify-center">
          <span className="landing-stamp border-[var(--oxblood)] text-[var(--oxblood)]">
            Cửa sổ phủ nhận
          </span>
        </div>

        <h2 className="font-display text-lg font-black leading-tight text-[var(--ink)] sm:text-xl">
          {info.ownerName} vừa chơi {label}
          {info.nopeCount > 0 ? ` · đã chặn ${info.nopeCount} lần` : ''}
        </h2>
        <p className="mt-1 text-xs font-semibold text-[var(--ink-soft)]">
          Ai có lá Phủ Nhận đều có thể chặn. Nope lẻ hủy, nope chẵn thi hành.
        </p>

        <div className="relative mt-3 h-2.5 overflow-hidden rounded-[2px] border-2 border-[var(--ink)] bg-[var(--paper-2)]">
          <div
            className="h-full bg-[var(--oxblood)] transition-all ease-linear"
            style={{ width: `${pct}%`, transitionDuration: '1000ms' }}
          />
        </div>
        <div className="mt-1.5 text-[11px] font-bold text-[var(--ink-soft)]">
          Còn lại <span className="text-[var(--oxblood)]">{countdown}s</span>
        </div>

        {canNope && nopeCards.length > 0 && (
          <div className="mt-3 border-2 border-[var(--ink)] bg-[var(--paper-2)] px-2.5 py-2 text-left">
            <div className="landing-overline">Lá có thể dùng</div>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {nopeCards.map((card) => (
                <span key={card.id} className="landing-chip">
                  🚫 {card.nameVN || 'Phủ Nhận'}
                </span>
              ))}
            </div>
            <div className="mt-1.5 text-[10px] font-semibold text-[var(--ink-soft)]">
              Bấm “Chặn lại ngay” hoặc chọn lá bài đang phát sáng.
            </div>
          </div>
        )}
        {!canNope && (
          <div className="mt-3 text-[10px] font-bold text-[var(--oxblood)]">
            Bạn không có lá Phủ Nhận nào trong tay.
          </div>
        )}

        <div className="mt-4 flex flex-wrap justify-center gap-2.5">
          <button
            onClick={handleNope}
            disabled={!canNope}
            autoFocus={canNope}
            className="landing-btn landing-btn--oxblood px-5 py-2.5 text-xs sm:text-sm"
          >
            🚫 Chặn lại ngay
          </button>

          <button
            onClick={handlePass}
            className="landing-btn landing-btn--paper px-5 py-2.5 text-xs sm:text-sm"
          >
            Bỏ qua
          </button>
        </div>
      </div>
    </div>
  );
}

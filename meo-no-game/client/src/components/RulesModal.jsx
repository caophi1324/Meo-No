import ModalShell from './ModalShell';
import { CARD_DATA } from '../data/cardData';
import { BEAST_CARDS, CARD_TYPES, WILD_BEAST } from '../../../shared/cardTypes.js';

const ACTION_TYPES = [
  CARD_TYPES.DEFUSE,
  CARD_TYPES.ATTACK,
  CARD_TYPES.SKIP,
  CARD_TYPES.FAVOR,
  CARD_TYPES.SHUFFLE,
  CARD_TYPES.NOPE,
  CARD_TYPES.REVERSE,
  CARD_TYPES.REVERSE_ALT,
  CARD_TYPES.ALTER_FUTURE,
  CARD_TYPES.STEAL_CARD,
  CARD_TYPES.BOOM_ATOMIC,
];

export default function RulesModal({ onClose }) {
  return (
    <ModalShell
      label="Luật chơi Mèo Nổ"
      onClose={onClose}
      overlayClassName="bg-[#0B1410]/80 backdrop-blur-[2px]"
      panelClassName="paper-modal flex max-h-[88vh] w-full max-w-3xl flex-col"
    >
      <div className="flex items-start justify-between gap-4 border-b-2 border-[var(--ink)] bg-[var(--paper-2)] px-5 py-4 sm:px-7">
        <div>
          <span className="landing-stamp">Sổ tay bàn chơi</span>
          <h2 className="mt-3 font-display text-2xl font-bold leading-tight text-[var(--ink)] sm:text-3xl">
            Luật chơi Mèo Nổ
          </h2>
          <p className="mt-1 text-xs font-semibold text-[var(--ink-soft)]">
            Tóm tắt đủ để vào bàn, không cần học thuộc.
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Đóng luật chơi"
          className="landing-icon-btn shrink-0"
        >
          ✕
        </button>
      </div>

      <div className="space-y-7 overflow-y-auto px-5 py-6 text-sm leading-relaxed text-[var(--ink-soft)] sm:px-7">
        <section>
          <div className="landing-overline">Mục tiêu</div>
          <p className="mt-2 max-w-2xl text-base leading-relaxed text-[var(--ink)]">
            Là người chơi <strong className="font-bold">cuối cùng không nổ tung</strong>. Mỗi lượt
            bạn có thể chơi bao nhiêu lá tùy thích, sau đó rút 1 lá để kết thúc lượt. Rút trúng Mèo
            Nổ mà không có Gỡ Bom là bị loại.
          </p>
        </section>

        <section>
          <div className="landing-overline">Một lượt chơi</div>
          <ul className="mt-3 space-y-2.5 border-t-2 border-[var(--ink)] pt-3">
            <li className="border-b border-[var(--line)] pb-2.5">
              <b className="text-[var(--ink)]">Lượt bình thường:</b> chơi bài thoải mái, rút 1 lá,
              chuyển người kế tiếp.
            </li>
            <li className="border-b border-[var(--line)] pb-2.5">
              <b className="text-[var(--ink)]">Tấn Công:</b> kết thúc lượt ngay, không rút bài; người
              kế tiếp phải đi 2 lượt.
            </li>
            <li className="border-b border-[var(--line)] pb-2.5">
              <b className="text-[var(--ink)]">Bỏ Lượt:</b> kết thúc toàn bộ lượt hiện tại, không cần
              rút bài.
            </li>
            <li className="border-b border-[var(--line)] pb-2.5">
              <b className="text-[var(--ink)]">Đảo Chiều:</b> kết thúc lượt hiện tại và đổi chiều rút
              bài.
            </li>
            <li className="border-b border-[var(--line)] pb-2.5">
              <b className="text-[var(--ink)]">Siêu Bỏ Lượt:</b> kết thúc toàn bộ lượt còn lại của
              bạn, khỏi rút bài.
            </li>
            <li className="border-b border-[var(--line)] pb-2.5">
              <b className="text-[var(--ink)]">Nạp Nhiên Liệu:</b> lá Tấn Công kế tiếp đẩy đối thủ đi
              3 lượt thay vì 2. Hiệu ứng mất khi lượt bạn kết thúc.
            </li>
            <li>
              <b className="text-[var(--ink)]">Kiến Tạo Tương Lai:</b> xem và sắp xếp lại 3 lá trên
              cùng chồng bài rút.
            </li>
          </ul>
        </section>

        <section className="paper-callout">
          <div className="landing-overline">Phủ Nhận (Nope)</div>
          <p className="mt-2">
            Khi ai đó chơi lá hành động, cửa sổ Phủ Nhận mở theo cài đặt của phòng. Ai có lá Phủ Nhận
            đều có thể bấm để hủy hành động đó, kể cả Phủ Nhận chính cái Phủ Nhận vừa rồi. Nope lẻ
            hủy hành động, nope chẵn thi hành. Lá ghi “không thể Nope” thì không mở cửa sổ này.
          </p>
        </section>

        <section>
          <div className="landing-overline">Combo mèo và thú</div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div className="paper-panel paper-panel--soft p-3">
              <div className="font-display text-sm font-bold text-[var(--ink)]">Mèo</div>
              <p className="mt-1 text-xs">
                2 lá giống nhau: cướp 1 lá úp. 3 lá giống nhau: đòi đúng loại bài. 5 lá khác loại:
                lấy 1 lá từ chồng bài hạ.
              </p>
            </div>
            <div className="paper-panel paper-panel--soft p-3">
              <div className="font-display text-sm font-bold text-[var(--ink)]">Thú</div>
              <p className="mt-1 text-xs">
                2 lá cùng loại (hoặc 1 thú + Siêu Thú Cưng): cướp 1 lá úp. 3 lá: đòi đúng loại. 5
                loại khác nhau: lấy 1 lá từ chồng hạ. Không trộn mèo với thú.
              </p>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {[...BEAST_CARDS, WILD_BEAST].map((type) => (
              <span key={type} className="landing-chip">
                {CARD_DATA[type]?.emoji} {CARD_DATA[type]?.nameVN || type}
              </span>
            ))}
          </div>
        </section>

        <section>
          <div className="landing-overline">Các lá hành động</div>
          <div className="mt-3 border-t-2 border-[var(--ink)]">
            {ACTION_TYPES.map((type) => {
              const c = CARD_DATA[type];
              return (
                <div key={type} className="paper-ledger-row">
                  <span className="text-xl leading-none" aria-hidden="true">
                    {c.emoji}
                  </span>
                  <div>
                    <div className="font-display text-sm font-bold text-[var(--ink)]">{c.nameVN}</div>
                    <p className="mt-0.5 text-xs leading-relaxed">{c.descriptionVN}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section>
          <div className="landing-overline">Bom trên bàn</div>
          <div className="mt-3 space-y-2 border-t-2 border-[var(--ink)] pt-3 text-xs">
            <p>
              <b className="text-[var(--ink)]">Exploding Kitten:</b> bốc phải mà không có Gỡ Bom thì
              bị loại; lá bài bị hủy khỏi ván.
            </p>
            <p>
              <b className="text-[var(--ink)]">Imploding Kitten:</b> lần đầu bốc mặt úp thì lật ngửa
              và đặt lại; lần sau bốc mặt ngửa thì chết.
            </p>
            <p>
              <b className="text-[var(--ink)]">Boom Nguyên Tử:</b> khi bốc phải, đưa tất cả Exploding
              Kitten lên đầu chồng bài, kết thúc lượt và lá Boom bị hủy khỏi ván.
            </p>
          </div>
        </section>
      </div>

      <div className="flex flex-col gap-3 border-t-2 border-[var(--ink)] bg-[var(--paper-2)] px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-7">
        <p className="text-[11px] font-semibold text-[var(--ink-soft)]">
          Mẹo: giữ một lá Phủ Nhận đến cuối ván. Không ai đoán được bạn sẽ dùng lúc nào.
        </p>
        <button type="button" onClick={onClose} className="landing-btn landing-btn--oxblood shrink-0 text-xs">
          Đã hiểu, vào bàn
        </button>
      </div>
    </ModalShell>
  );
}

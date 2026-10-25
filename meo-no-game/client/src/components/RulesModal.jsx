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
  const actionTypes = ACTION_TYPES;

  return (
    <ModalShell
      label="Luật chơi Mèo Nổ"
      onClose={onClose}
      overlayClassName="bg-black/80"
      panelClassName="bg-slate-800 rounded-2xl border border-orange-500 max-w-2xl w-full max-h-[88vh] flex flex-col"
    >
        <div className="px-6 py-4 border-b border-slate-700 flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">📖 LUẬT CHƠI MÈO NỔ</h2>
          <button
            onClick={onClose}
            className="text-slate-300 hover:text-white text-xl leading-none px-1"
          >
            ✕
          </button>
        </div>

        <div className="px-6 py-4 overflow-y-auto space-y-5 text-sm text-slate-200">
          <section>
            <h3 className="font-bold text-orange-400 mb-1">🎯 Mục tiêu</h3>
            <p>
              Là người chơi CUỐI CÙNG không nổ tung. Mỗi lượt bạn có thể chơi bao nhiêu lá bài tùy
              thích, sau đó RÚT 1 LÁ để kết thúc lượt. Rút trúng Mèo Nổ 💥 mà không có Gỡ Bom 🔧 là
              bay màu!
            </p>
          </section>

          <section>
            <h3 className="font-bold text-orange-400 mb-1">🔄 Lượt chơi</h3>
            <ul className="list-disc list-inside space-y-1">
              <li>Lượt bình thường: chơi bài thoải mái → rút 1 lá → chuyển người kế tiếp.</li>
              <li>
                <b>Tấn Công ⚔️:</b> kết thúc lượt ngay (không rút bài), người kế tiếp phải đi 2 lượt.
              </li>
              <li>
                <b>Bỏ Lượt ⏭️:</b> kết thúc toàn bộ lượt hiện tại ngay lập tức, không cần rút bài.
              </li>
              <li>
                <b>Đảo Chiều 🔄:</b> kết thúc lượt hiện tại và đổi chiều rút bài.
              </li>
              <li>
                <b>Siêu Bỏ Lượt ⏩:</b> kết thúc toàn bộ lượt còn lại của bạn, khỏi rút bài.
              </li>
              <li>
                <b>Nạp Nhiên Liệu ⛽:</b> lá Tấn Công kế tiếp của bạn đẩy đối thủ đi 3 lượt thay vì
                2. Hiệu ứng mất khi lượt bạn kết thúc.
              </li>
              <li>
                <b>Kiến Tạo Tương Lai 🌌:</b> xem và sắp xếp lại 3 lá trên cùng chồng bài rút.
              </li>
              <li>
                Rút trúng Mèo Nổ mà có Gỡ Bom: lén nhét nó lại vào vị trí bất kỳ trong chồng bài
                (vị trí 1 = trên cùng — hại người kế tiếp!).
              </li>
            </ul>
          </section>

          <section>
            <h3 className="font-bold text-orange-400 mb-1">🚫 Phủ Nhận (Nope)</h3>
            <p>
              Khi ai đó chơi lá hành động, cửa sổ Phủ Nhận mở theo <b>cài đặt của phòng</b>. Ai có lá Phủ Nhận
              đều có thể bấm để hủy hành động đó — kể cả Phủ Nhận chính cái Phủ Nhận vừa rồi (nope
              chẵn → hành động chạy, nope lẻ → hành động bị hủy). Riêng lá ghi “không thể Nope” thì
              không mở cửa sổ này.
            </p>
          </section>

          <section>
            <h3 className="font-bold text-orange-400 mb-1">🐱 Combo mèo</h3>
            <ul className="list-disc list-inside space-y-1">
              <li>
                <b>2 lá mèo giống nhau:</b> cướp ngẫu nhiên 1 lá từ tay đối thủ.
              </li>
              <li>
                <b>3 lá mèo giống nhau:</b> đòi 1 lá cụ thể — nếu đối thủ không có thì xui thôi!
              </li>
              <li>
                <b>5 lá mèo khác loại:</b> lấy 1 lá bất kỳ từ chồng bài đã đánh.
              </li>
            </ul>
          </section>

          <section>
            <h3 className="font-bold text-orange-400 mb-1">🦊 Combo thú</h3>
            <p className="text-xs text-slate-300">
              2 lá cùng loại (hoặc 1 thú + Siêu Thú Cưng) → cướp 1 lá úp. 3 lá cùng loại → đòi
              đúng loại bài. 5 loại khác nhau (tối đa 1 Siêu Thú) → lấy 1 lá từ chồng hạ.
              <b> Không trộn mèo với thú.</b>
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {[...BEAST_CARDS, WILD_BEAST].map((type) => (
                <span key={type} className="rounded-md border border-slate-600 bg-slate-700/50 px-2 py-1 text-[10px] text-slate-200">
                  {CARD_DATA[type]?.emoji} {CARD_DATA[type]?.nameVN || type}
                </span>
              ))}
            </div>
          </section>

          <section>
            <h3 className="font-bold text-orange-400 mb-2">🃏 Các lá bài hành động</h3>
            <div className="space-y-2">
              {actionTypes.map((type) => {
                const c = CARD_DATA[type];
                return (
                  <div key={type} className="flex gap-3 items-start bg-slate-700/50 rounded-xl p-2.5">
                    <span className="text-2xl">{c.emoji}</span>
                    <div>
                      <div className="font-bold text-white text-xs">{c.nameVN}</div>
                      <div className="text-xs text-slate-300">{c.descriptionVN}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <section>
            <h3 className="font-bold text-orange-400 mb-2">💣 Bom trong bàn</h3>
            <div className="space-y-2 text-xs text-slate-300">
              <p>
                <b>Exploding Kitten:</b> bốc phải mà không có Gỡ Bom thì bị loại; lá bài bị hủy
                khỏi ván.
              </p>
              <p>
                <b>Imploding Kitten:</b> lần đầu bốc mặt úp thì lật ngửa và đặt lại; lần sau bốc mặt ngửa thì chết.
              </p>
              <p>
                <b>Boom Nguyên Tử:</b> khi bốc phải, đưa tất cả Exploding Kitten lên đầu chồng bài,
                kết thúc lượt và lá Boom bị hủy khỏi ván.
              </p>
            </div>
          </section>
        </div>

        <div className="px-6 py-3 border-t border-slate-700 text-right">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-xl font-bold transition-all"
          >
            Đã hiểu! Vào chơi 🎮
          </button>
        </div>
    </ModalShell>
  );
}

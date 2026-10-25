import { useEffect, useMemo, useState } from 'react';
import ModalShell from './ModalShell';
import Card from './Card';
import { soundEffects } from '../utils/soundEffects';

const TITLES = {
  position_dao_boi: '🔎 ĐÀO BỚI',
  position_draw: '🦜 BỐC Ở ĐÂU CŨNG ĐƯỢC',
  search_top5: '🔎 TÌM KIẾM',
  disable_card: '🐱 LÀM PHIỀN',
  revive_cards: '🌱 HỒI SINH',
  reaction: '🛡️ PHẢN ĐÒN',
  discard_half_pick: '🍕 CHIA SẺ',
  destroy_pick: '💥 HỦY BÀI',
  reaction_pick: '🛡️ PHẢN ĐÒN',
  copy_target: '🐊 SAO CHÉP',
  party_pick: '🎂 TIỆC TÙNG',
  reveal_pick: '👁️ GIỜ GIẢI LAO',
};

const HINTS = {
  position_dao_boi: 'Xem lá trên cùng rồi chọn vị trí đặt lại (1 = trên cùng).',
  position_draw: 'Chọn vị trí muốn bốc. Lá bài sẽ được rút và kết thúc lượt.',
  search_top5: 'Chọn 1 trong 5 lá trên cùng để đưa vào tay.',
  disable_card: 'Chọn 1 lá của đối thủ để khóa trong lượt tới.',
  revive_cards: 'Chọn đủ số lá từ những người đã bị loại.',
  reaction: 'Bạn vừa bị cướp. Có thể đánh lá phản đòn để cướp lại 2 lá.',
  discard_half_pick: 'Bạn bị Chia Sẻ — tự chọn đúng số lá phải hủy.',
  destroy_pick: 'Chọn các lá úp của người bị Hủy Bài.',
  reaction_pick: 'Chọn 2 lá úp từ người vừa cướp bạn.',
  copy_target: 'Chọn người để Sao Chép hành động.',
  party_pick: 'Chọn 1 lá úp từ tay bạn để đặt lên đầu chồng bài.',
  reveal_pick: 'Chọn các lá úp của người bị xem. Chỉ bạn thấy chúng.',
};

export default function ChoiceModal({ choice, secondsLeft = null, onRespond }) {
  const [position, setPosition] = useState(0);
  const [picked, setPicked] = useState([]);

  useEffect(() => {
    setPosition(0);
    setPicked([]);
  }, [choice?.id]);

  const max = Math.max(0, choice?.maxPosition ?? 0);
  const title = TITLES[choice?.kind] || 'LỰA CHỌN';
  const hint = HINTS[choice?.kind] || '';
  const isMulti =
    choice?.kind === 'revive_cards' ||
    choice?.kind === 'discard_half_pick' ||
    choice?.kind === 'party_pick';
  const needed = choice?.count || 1;

  const canSubmitMulti = useMemo(
    () => picked.length === needed,
    [picked.length, needed]
  );

  const respond = (value) => {
    soundEffects.playCard();
    onRespond?.(value);
  };

  const togglePicked = (id) => {
    soundEffects.playClick();
    setPicked((current) => {
      if (current.includes(id)) return current.filter(x => x !== id);
      if (needed === 1) return [id];
      return current.length < needed ? [...current, id] : current;
    });
  };

  return (
    <ModalShell
      label={title}
      overlayClassName="bg-black/85 backdrop-blur-sm animate-in fade-in duration-200"
      panelClassName="bg-gradient-to-b from-slate-800 via-slate-900 to-slate-950 rounded-3xl p-6 border-2 border-amber-400 max-w-xl w-full shadow-2xl shadow-amber-500/20"
    >
      <h2 className="mb-1 text-center font-display text-xl font-black text-white">{title}</h2>
      <p className="mb-3 text-center text-xs text-slate-400">{hint}</p>
      {secondsLeft !== null && (
        <p className="mb-3 text-center text-[11px] font-black text-amber-300" aria-live="polite">
          ⏳ Còn {secondsLeft}s — hết giờ hệ thống sẽ tự chọn
        </p>
      )}

      {(choice?.kind === 'position_dao_boi' || choice?.kind === 'position_draw') && (
        <div className="space-y-4">
          {choice?.kind === 'position_dao_boi' && choice.cards?.[0] && (
            <div className="flex justify-center">
              <Card card={choice.cards[0]} size="small" />
            </div>
          )}
          <div className="rounded-2xl border border-slate-700 bg-slate-800/80 p-4">
            <input
              type="range"
              min={0}
              max={max}
              value={position}
              onChange={(e) => setPosition(Number(e.target.value))}
              className="w-full accent-amber-400"
              aria-label="Chọn vị trí trong chồng bài"
            />
            <div className="mt-2 flex items-center justify-between text-xs font-bold text-amber-300">
              <span>Trên cùng</span>
              <span className="rounded-full border border-amber-500/50 bg-amber-950/60 px-3 py-1">
                Vị trí {position + 1}
              </span>
              <span>Dưới cùng</span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => respond(position)}
            className="w-full rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 py-3 text-sm font-black text-slate-950 shadow-lg shadow-amber-500/25"
          >
            XÁC NHẬN VỊ TRÍ {position + 1}
          </button>
        </div>
      )}

      {choice?.kind === 'search_top5' && (
        <div className="flex flex-wrap justify-center gap-2.5 max-h-80 overflow-y-auto p-1">
          {(choice.cards || []).map((card) => (
            <Card key={card.id} card={card} size="small" onClick={() => respond(card.id)} />
          ))}
        </div>
      )}

      {choice?.kind === 'disable_card' && (
        <div className="space-y-3">
          <p className="text-center text-xs font-bold text-amber-300">
            {choice.targetName || 'Đối thủ'} có {choice.cardCount} lá trên tay
          </p>
          <div className="flex flex-wrap justify-center gap-2.5">
            {Array.from({ length: choice.cardCount || 0 }, (_, index) => (
              <div key={index} className="flex flex-col items-center gap-1">
                <Card
                  card={{ id: `hidden-${index}`, type: 'hidden' }}
                  faceDown
                  size="small"
                  onClick={() => respond(index)}
                />
                <span className="text-[10px] font-bold text-slate-400">Lá {index + 1}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {isMulti && (
        <div className="space-y-3">
          <p className="text-center text-xs font-black text-amber-300">
            Đã chọn {picked.length}/{needed}
          </p>
          <div className="flex max-h-80 flex-wrap justify-center gap-2.5 overflow-y-auto p-1">
            {(choice.cards || []).map((card) => (
              <div key={card.id} className="flex flex-col items-center gap-1">
                <Card
                  card={card}
                  size="small"
                  selected={picked.includes(card.id)}
                  onClick={() => togglePicked(card.id)}
                />
                {card.ownerName && (
                  <span className="max-w-20 truncate text-[10px] font-bold text-slate-400">
                    {card.ownerName}
                  </span>
                )}
              </div>
            ))}
          </div>
          <button
            type="button"
            disabled={!canSubmitMulti}
            onClick={() => respond(picked)}
            className={`w-full rounded-2xl py-3 text-sm font-black shadow-lg ${
              canSubmitMulti
                ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-slate-950 shadow-emerald-500/25'
                : 'cursor-not-allowed border border-slate-700 bg-slate-800 text-slate-500'
            }`}
          >
            {choice.kind === 'revive_cards'
              ? 'XÁC NHẬN HỒI SINH'
              : choice.kind === 'party_pick'
                ? 'ÚP LÁ NÀY'
                : 'XÁC NHẬN HỦY'}
          </button>
        </div>
      )}

      {(choice?.kind === 'destroy_pick' ||
        choice?.kind === 'reaction_pick' ||
        choice?.kind === 'reveal_pick') && (
        <div className="space-y-3">
          <p className="text-center text-xs font-black text-amber-300">
            Đã chọn {picked.length}/{needed}
          </p>
          <div className="flex max-h-80 flex-wrap justify-center gap-2.5 overflow-y-auto p-1">
            {Array.from({ length: choice.cardCount || 0 }, (_, index) => (
              <div key={index} className="flex flex-col items-center gap-1">
                <Card
                  card={{ id: `hidden-${index}`, type: 'hidden' }}
                  faceDown
                  size="small"
                  selected={picked.includes(index)}
                  onClick={() => togglePicked(index)}
                />
                <span className="text-[10px] font-bold text-slate-400">Lá {index + 1}</span>
              </div>
            ))}
          </div>
          <button
            type="button"
            disabled={picked.length !== needed}
            onClick={() => respond(picked)}
            className={`w-full rounded-2xl py-3 text-sm font-black shadow-lg ${
              picked.length === needed
                ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-slate-950 shadow-emerald-500/25'
                : 'cursor-not-allowed border border-slate-700 bg-slate-800 text-slate-500'
            }`}
          >
            {choice.kind === 'reaction_pick'
              ? 'XÁC NHẬN PHẢN ĐÒN'
              : choice.kind === 'reveal_pick'
                ? 'XEM LÁ'
                : 'XÁC NHẬN HỦY'}
          </button>
        </div>
      )}

      {choice?.kind === 'copy_target' && (
        <div className="space-y-2.5">
          {(choice.cards || []).map((target) => (
            <button
              key={target.id}
              type="button"
              onClick={() => respond(target.id)}
              className="w-full rounded-2xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm font-bold text-white transition-colors hover:border-amber-400 hover:bg-amber-600/30"
            >
              {target.name}
            </button>
          ))}
        </div>
      )}

      {choice?.kind === 'reaction' && (
        <div className="space-y-3">
          <div className="flex flex-wrap justify-center gap-2.5">
            {(choice.cards || []).map((card) => (
              <Card key={card.id} card={card} size="small" onClick={() => respond(card.id)} />
            ))}
          </div>
          <button
            type="button"
            onClick={() => respond('pass')}
            className="w-full rounded-2xl border border-slate-700 bg-slate-800 py-2.5 text-xs font-bold text-slate-300 hover:bg-slate-700"
          >
            BỎ QUA PHẢN ĐÒN
          </button>
        </div>
      )}
    </ModalShell>
  );
}

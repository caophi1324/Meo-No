import { CARD_TYPES, CAT_CARDS, BEAST_CARDS } from '../../shared/cardTypes.js';

// ============================================================
// BƯỚC 10 — Bot AI (Mèo Máy)
// Bot CHỈ nhận `view` đã được stateSanitizer lọc (đúng như người
// thật thấy) + "bộ nhớ" riêng của chính nó (kết quả Nhìn Tương Lai).
// TUYỆT ĐỐI không đọc drawPile hay bài trên tay người khác.
// ============================================================

const rand = arr => arr[Math.floor(Math.random() * arr.length)];

const GIVE_VALUE = {
  [CARD_TYPES.DEFUSE]: 100,
  [CARD_TYPES.NOPE]: 80,
  [CARD_TYPES.SUPER_SKIP]: 75,
  [CARD_TYPES.SUPER_DESTROY]: 70,
  [CARD_TYPES.ATTACK]: 60,
  [CARD_TYPES.SKIP]: 55,
  [CARD_TYPES.FUEL]: 50,
  [CARD_TYPES.FAVOR]: 50,
  [CARD_TYPES.REVERSE]: 45,
  [CARD_TYPES.ALTER_FUTURE]: 45,
  [CARD_TYPES.SEE_THE_FUTURE]: 40,
  [CARD_TYPES.SHUFFLE]: 35,
};

export class BotAI {
  constructor(playerId, difficulty = 'normal') {
    this.playerId = playerId;
    this.difficulty = ['easy', 'normal', 'hard'].includes(difficulty) ? difficulty : 'normal';
    this.memory = { topCards: null, seenPileCount: null };
  }

  resetMemory() {
    this.memory = { topCards: null, seenPileCount: null };
  }

  // Cập nhật bộ nhớ khi chồng bài bị rút bớt (đếm công khai qua drawPileCount)
  refreshMemory(view) {
    if (!this.memory.topCards) return;
    const seen = this.memory.seenPileCount ?? view.drawPileCount;
    const drawn = seen - view.drawPileCount;
    if (drawn > 0) {
      this.memory.topCards = this.memory.topCards.slice(drawn);
      if (this.memory.topCards.length === 0) this.memory.topCards = null;
    }
    this.memory.seenPileCount = view.drawPileCount;
  }

  decide(view) {
    if (!view || view.status !== 'playing') return { type: 'nope_pass' };
    this.refreshMemory(view);

    if (view.waitingFor === 'nope') return this.decideNope(view);
    if (view.waitingFor === 'defuse_place') return this.decideDefusePosition(view);
    if (view.waitingFor === 'imploding_place') return this.decideImplodingPosition(view);
    if (view.waitingFor === 'favor_give') return this.decideFavorGive(view);
    if (view.waitingFor === 'alter_future') return this.decideAlterFuture(view);
    if (!view.waitingFor && view.isMyTurn) return this.decideTurn(view);
    return { type: 'nope_pass' };
  }

  // ===== Lượt của bot =====
  decideTurn(view) {
    const hand = view.myHand || [];
    if (hand.length === 0) return { type: 'draw_card' };
    const d = this.difficulty;
    const opponents = (view.opponents || []).filter(o => o.isAlive);

    const counts = {};
    for (const c of hand) (counts[c.type] = counts[c.type] || []).push(c);
    const has = t => !!(counts[t] && counts[t].length);
    const firstId = t => counts[t][0].id;

    const memoryTop = this.memory.topCards?.[0] || null;
    const top3HasEK = (this.memory.topCards || []).some(c => c.type === CARD_TYPES.EXPLODING_KITTEN);

    // --- Siêu Bỏ Lượt: thoát khỏi chuỗi bị Tấn Công ---
    if (has(CARD_TYPES.SUPER_SKIP) && view.turnsRemaining > 1) {
      return { type: 'play_card', cardIds: [firstId(CARD_TYPES.SUPER_SKIP)] };
    }

    // --- Nạp Nhiên Liệu trước khi Tấn Công để đẩy 3 lượt ---
    if (
      has(CARD_TYPES.FUEL) &&
      has(CARD_TYPES.ATTACK) &&
      view.fueledPlayerId !== this.playerId
    ) {
      return { type: 'play_card', cardIds: [firstId(CARD_TYPES.FUEL)] };
    }

    // --- Kiến Tạo Tương Lai khi chưa biết bài hoặc biết có Mèo Nổ ---
    if (has(CARD_TYPES.ALTER_FUTURE) && (!this.memory.topCards || top3HasEK) && Math.random() < 0.75) {
      return { type: 'play_card', cardIds: [firstId(CARD_TYPES.ALTER_FUTURE)] };
    }

    // --- Siêu Hủy Bài: nhắm người nhiều bài nhất, ưu tiên hủy Gỡ Bom ---
    const destroyTargets = opponents.filter(o => o.cardCount > 0);
    if (has(CARD_TYPES.SUPER_DESTROY) && destroyTargets.length > 0) {
      const target = [...destroyTargets].sort((a, b) => b.cardCount - a.cardCount)[0];
      const wanted =
        d === 'hard'
          ? CARD_TYPES.DEFUSE
          : rand([CARD_TYPES.DEFUSE, CARD_TYPES.NOPE, CARD_TYPES.ATTACK, CARD_TYPES.SKIP]);
      return {
        type: 'play_card',
        cardIds: [firstId(CARD_TYPES.SUPER_DESTROY)],
        targetPlayerId: target.id,
        requestedCardType: wanted,
      };
    }

    // --- Đảo Chiều: với 2 người tác dụng như Bỏ Lượt ---
    if (has(CARD_TYPES.REVERSE) && (view.turnsRemaining > 1 || top3HasEK) && Math.random() < 0.6) {
      return { type: 'play_card', cardIds: [firstId(CARD_TYPES.REVERSE)] };
    }

    // --- Khó: xử lý khi biết lá trên cùng là Mèo Nổ ---
    if (d === 'hard' && memoryTop && memoryTop.type === CARD_TYPES.EXPLODING_KITTEN) {
      if (has(CARD_TYPES.SKIP)) return { type: 'play_card', cardIds: [firstId(CARD_TYPES.SKIP)] };
      if (has(CARD_TYPES.SHUFFLE)) return { type: 'play_card', cardIds: [firstId(CARD_TYPES.SHUFFLE)] };
      if (has(CARD_TYPES.ATTACK)) {
        const next = opponents[0];
        if (next && next.cardCount <= 3) return { type: 'play_card', cardIds: [firstId(CARD_TYPES.ATTACK)] };
      }
    }

    // --- Combo 5 lá khác loại: lấy lá tốt từ chồng hạ ---
    const discard = view.discardPile || [];
    const catTypes = CAT_CARDS.filter(t => has(t));
    const beastTypes = BEAST_CARDS.filter(t => has(t));
    const fiveTypes = catTypes.length >= 5 ? catTypes : beastTypes.length >= 5 ? beastTypes : null;
    if (fiveTypes && discard.length > 0) {
      const goodTypes = [CARD_TYPES.DEFUSE, CARD_TYPES.NOPE, CARD_TYPES.ATTACK, CARD_TYPES.SKIP];
      const goodPick = [...discard].reverse().find(c => goodTypes.includes(c.type));
      const chance = d === 'hard' ? 1 : d === 'normal' ? 0.6 : 0.15;
      if (goodPick && Math.random() <= chance) {
        const pickCard = goodPick;
        return {
          type: 'play_card',
          cardIds: fiveTypes.slice(0, 5).map(t => firstId(t)),
          discardPickId: pickCard.id,
        };
      }
    }

    // --- Combo 2–3 lá mèo/thú giống nhau ---
    const comboTypes = [...CAT_CARDS, ...BEAST_CARDS].filter(t => has(t) && counts[t].length >= 2);
    if (comboTypes.length > 0 && opponents.length > 0) {
      const targetPool = opponents.filter(o => o.cardCount > 0);
      if (targetPool.length > 0) {
        const target =
          d === 'easy'
            ? rand(targetPool)
            : [...targetPool].sort((a, b) => b.cardCount - a.cardCount)[0];
        for (const t of comboTypes) {
          const cnt = counts[t].length;
          const size = d !== 'easy' && cnt >= 3 ? 3 : 2;
          const cardIds = counts[t].slice(0, size).map(c => c.id);
          if (size === 3) {
            const wanted =
              d === 'hard'
                ? CARD_TYPES.DEFUSE
                : rand([CARD_TYPES.SKIP, CARD_TYPES.ATTACK, CARD_TYPES.FAVOR, CARD_TYPES.SHUFFLE]);
            return { type: 'play_card', cardIds, targetPlayerId: target.id, requestedCardType: wanted };
          }
          if (d !== 'easy' || Math.random() < 0.5) {
            return { type: 'play_card', cardIds, targetPlayerId: target.id };
          }
        }
      }
    }

    if (d === 'easy') {
      // Dễ: hành động ngẫu nhiên, hay quên rút bài
      const pool = [CARD_TYPES.ATTACK, CARD_TYPES.SKIP, CARD_TYPES.SHUFFLE, CARD_TYPES.SEE_THE_FUTURE, CARD_TYPES.FAVOR].filter(has);
      if (pool.length > 0 && Math.random() < 0.45) {
        const t = rand(pool);
        const extra = {};
        if (t === CARD_TYPES.FAVOR) {
          const ft = opponents.filter(o => o.cardCount > 0);
          if (ft.length === 0) return { type: 'draw_card' };
          extra.targetPlayerId = rand(ft).id;
        }
        return { type: 'play_card', cardIds: [firstId(t)], ...extra };
      }
      return { type: 'draw_card' };
    }

    // --- Thường / Khó ---
    const favorTargets = opponents.filter(o => o.cardCount > 0).sort((a, b) => a.cardCount - b.cardCount);

    // Xin bài người ít bài nhất (dễ đoán họ có ít lựa chọn)
    if (has(CARD_TYPES.FAVOR) && favorTargets.length > 0 && Math.random() < (d === 'hard' ? 0.9 : 0.7)) {
      return { type: 'play_card', cardIds: [firstId(CARD_TYPES.FAVOR)], targetPlayerId: favorTargets[0].id };
    }
    // Xáo trộn khi biết Mèo Nổ nằm trong 3 lá đầu
    if (has(CARD_TYPES.SHUFFLE) && top3HasEK) {
      return { type: 'play_card', cardIds: [firstId(CARD_TYPES.SHUFFLE)] };
    }
    // Nhìn tương lai khi chưa có thông tin
    if (has(CARD_TYPES.SEE_THE_FUTURE) && !this.memory.topCards) {
      return { type: 'play_card', cardIds: [firstId(CARD_TYPES.SEE_THE_FUTURE)] };
    }
    // Tấn công khi người kế tiếp có ít bài
    const next = opponents[0];
    if (has(CARD_TYPES.ATTACK) && next && next.cardCount <= 2) {
      return { type: 'play_card', cardIds: [firstId(CARD_TYPES.ATTACK)] };
    }
    // Bỏ lượt khi đang bị ép nhiều lượt
    if (has(CARD_TYPES.SKIP) && view.turnsRemaining > 1) {
      return { type: 'play_card', cardIds: [firstId(CARD_TYPES.SKIP)] };
    }
    // Bỏ lượt né bom khi lá trên cùng xấu mà không còn cách khác
    if (has(CARD_TYPES.SKIP) && top3HasEK) {
      return { type: 'play_card', cardIds: [firstId(CARD_TYPES.SKIP)] };
    }
    // Còn hành động thì dùng bớt (không vội rút)
    if (has(CARD_TYPES.ATTACK) && Math.random() < (d === 'hard' ? 0.6 : 0.35)) {
      return { type: 'play_card', cardIds: [firstId(CARD_TYPES.ATTACK)] };
    }
    if (has(CARD_TYPES.SKIP) && Math.random() < (d === 'hard' ? 0.5 : 0.3)) {
      return { type: 'play_card', cardIds: [firstId(CARD_TYPES.SKIP)] };
    }
    if (has(CARD_TYPES.SEE_THE_FUTURE)) {
      return { type: 'play_card', cardIds: [firstId(CARD_TYPES.SEE_THE_FUTURE)] };
    }

    return { type: 'draw_card' };
  }

  // ===== Sắp xếp 3 lá tương lai =====
  decideAlterFuture(view) {
    const cards = view.alterFutureCards || [];
    const ids = cards.map(c => c.id);
    if (ids.length <= 1) return { type: 'alter_future_submit', order: ids };

    let order = [...ids];
    if (this.difficulty === 'easy') {
      order = [...ids].sort(() => Math.random() - 0.5);
    } else {
      const ek = cards.find(c => c.type === CARD_TYPES.EXPLODING_KITTEN);
      if (ek && (this.difficulty === 'hard' || Math.random() < 0.5)) {
        order = [...ids.filter(id => id !== ek.id), ek.id];
      }
    }

    const byId = new Map(cards.map(c => [c.id, c]));
    this.memory.topCards = order.map(id => byId.get(id));
    this.memory.seenPileCount = view.drawPileCount;
    return { type: 'alter_future_submit', order };
  }

  // ===== Cửa sổ Phủ Nhận =====
  decideNope(view) {
    const d = this.difficulty;
    if (!view.pendingActionType || view.pendingActionOwner === this.playerId) {
      return { type: 'nope_pass' };
    }
    if (!(view.myHand || []).some(c => c.type === CARD_TYPES.NOPE)) {
      return { type: 'nope_pass' };
    }
    // Chuỗi đang ở trạng thái "đã hủy" (lẻ) — không cần nope tiếp
    if ((view.nopeCount || 0) % 2 === 1) return { type: 'nope_pass' };

    const action = view.pendingActionType;
    const attackHitsMe = action === CARD_TYPES.ATTACK && view.pendingActionTarget === this.playerId;
    const favorOnMe = action === CARD_TYPES.FAVOR && view.pendingActionTarget === this.playerId;
    const stealFromMe = action === 'cat_combo' && view.pendingActionTarget === this.playerId;
    const destroyHitsMe = action === CARD_TYPES.SUPER_DESTROY && view.pendingActionTarget === this.playerId;
    const harmful = attackHitsMe || favorOnMe || stealFromMe || destroyHitsMe;

    let chance = 0;
    if (d === 'easy') {
      chance = harmful ? 0.25 : 0.08;
    } else if (d === 'normal') {
      if (harmful) chance = 0.7;
      else if (action === CARD_TYPES.SEE_THE_FUTURE) chance = 0.15;
      else chance = 0.05;
    } else {
      if (harmful) chance = 0.85;
      else if (action === CARD_TYPES.SEE_THE_FUTURE) chance = 0.3;
      else if (action === CARD_TYPES.SHUFFLE) chance = 0.15;
      else chance = 0.08;
    }
    return Math.random() < chance ? { type: 'nope_action' } : { type: 'nope_pass' };
  }

  // ===== Chọn vị trí nhét Mèo Nổ =====
  decideDefusePosition(view) {
    const n = Math.max(0, view.drawPileCount | 0);
    if (n === 0) return { type: 'defuse_place', position: 0 };
    if (this.difficulty === 'easy') {
      return { type: 'defuse_place', position: Math.floor(Math.random() * (n + 1)) };
    }
    if (this.difficulty === 'hard') {
      const opponents = (view.opponents || []).filter(o => o.isAlive);
      const next = opponents[0];
      if (next && next.cardCount <= 1) return { type: 'defuse_place', position: 0 };
      return { type: 'defuse_place', position: 1 + Math.floor(Math.random() * n) };
    }
    // Thường: tránh vị trí đầu (mình có thể bị ép rút tiếp)
    return { type: 'defuse_place', position: Math.min(n, 1 + Math.floor(Math.random() * n)) };
  }

  // ===== Đặt lại Imploding Kitten sau khi lật ngửa =====
  decideImplodingPosition(view) {
    const n = Math.max(0, view.drawPileCount | 0);
    if (n === 0) return { type: 'imploding_place', position: 0 };
    if (this.difficulty === 'hard') {
      // Đẩy xuống dưới để người kế tiếp dễ gặp hơn.
      return { type: 'imploding_place', position: 1 + Math.floor(Math.random() * n) };
    }
    return { type: 'imploding_place', position: Math.floor(Math.random() * (n + 1)) };
  }

  // ===== Giao bài khi bị Xin Bài =====
  decideFavorGive(view) {
    const hand = view.myHand || [];
    if (hand.length === 0) return { type: 'favor_give', cardId: null };
    if (this.difficulty === 'easy') {
      return { type: 'favor_give', cardId: rand(hand).id };
    }
    const sorted = [...hand].sort((a, b) => (GIVE_VALUE[a.type] ?? 10) - (GIVE_VALUE[b.type] ?? 10));
    return { type: 'favor_give', cardId: sorted[0].id };
  }
}

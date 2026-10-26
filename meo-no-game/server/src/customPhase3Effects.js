import { CARD_TYPES } from '../../shared/cardTypes.js';
import { advanceTurn, cardView, handleAlterFuture, nextAlivePlayer, setChoice, takeVuongNiem } from './cardEffects.js';
import { shuffleDeck } from './deckBuilder.js';
import { addPrivateLog, addPublicLog } from './gameLog.js';

function playerOf(gameState, id) {
  return gameState.players.find(p => p.id === id);
}

function opponentsOf(gameState, id) {
  return gameState.players.filter(p => p.isAlive && p.id !== id);
}

function randomItem(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function chosenTarget(gameState, playerId, payload) {
  return gameState.players.find(
    p => p.id === payload?.targetPlayerId && p.isAlive && p.id !== playerId
  ) || randomItem(opponentsOf(gameState, playerId));
}

// Thứ tự Tiệc Tùng: bắt đầu từ người đánh, đi theo chiều lượt.
function partyQueue(gameState, playerId) {
  const start = gameState.players.findIndex(p => p.id === playerId);
  const len = gameState.players.length;
  const dir = gameState.direction === -1 ? -1 : 1;
  const queue = [];
  for (let step = 0; step < len; step++) {
    const p = gameState.players[(start + dir * step + len) % len];
    if (p && p.isAlive && p.hand?.length > 0) queue.push(p.id);
  }
  return queue;
}

// Mở choice cho người kế tiếp trong hàng đợi Tiệc Tùng.
export function openPartyChoice(gameState) {
  const party = gameState.pendingParty;
  while (party && party.index < party.queue.length) {
    const p = playerOf(gameState, party.queue[party.index]);
    if (p && p.isAlive && p.hand?.length > 0) {
      setChoice(gameState, {
        playerId: p.id,
        kind: 'party_pick',
        sourceType: CARD_TYPES.TIEC_TUNG,
        cards: p.hand.map(cardView),
        count: 1,
      });
      addPublicLog(gameState, `🎂 ${p.name} đang chọn 1 lá úp cho Tiệc Tùng.`);
      return { gameState, response: { type: 'choice_request', playerId: p.id } };
    }
    party.index += 1;
  }
  gameState.pendingParty = null;
  gameState.pendingChoice = null;
  gameState.waitingFor = null;
  addPublicLog(gameState, '🎂 Tiệc Tùng hoàn tất.');
  return { gameState, response: { type: 'choice_resolved', playerId: null } };
}

function drawFromPile(gameState, actor, card) {
  actor.hand.push(card);
  gameState.turnsRemaining = (gameState.turnsRemaining || 1) - 1;
  if (gameState.turnsRemaining <= 0) advanceTurn(gameState, 1);
}

function finishTurn(gameState) {
  gameState.turnsRemaining = 0;
  advanceTurn(gameState, 1);
}

export const CUSTOM_PHASE3_EFFECTS = {
  [CARD_TYPES.DAO_BOI]: (gameState, playerId) => {
    const player = playerOf(gameState, playerId);
    const card = gameState.drawPile[0];
    if (!card) return { gameState, response: { error: 'Chồng bài rút đang trống' } };
    setChoice(gameState, {
      playerId,
      kind: 'position_dao_boi',
      sourceType: CARD_TYPES.DAO_BOI,
      maxPosition: Math.max(0, gameState.drawPile.length - 1),
      cards: [cardView(card)],
    });
    addPublicLog(gameState, `🔎 ${player.name} đang xem lá trên cùng và chọn vị trí đặt lại.`, {
      kind: 'reveal',
    });
    addPrivateLog(gameState, [playerId], `Bạn thấy ${card.nameVN} trên cùng.`, {
      kind: 'reveal',
      cards: [cardView(card)],
    });
    return { gameState, response: { type: 'choice_request', playerId } };
  },

  [CARD_TYPES.TIM_KIEM]: (gameState, playerId) => {
    const player = playerOf(gameState, playerId);
    const top = gameState.drawPile.splice(0, 5);
    if (top.length === 0) return { gameState, response: { error: 'Chồng bài rút đang trống' } };
    setChoice(gameState, {
      playerId,
      kind: 'search_top5',
      sourceType: CARD_TYPES.TIM_KIEM,
      cards: top.map(cardView),
    });
    addPublicLog(gameState, `🔎 ${player.name} đang xem 5 lá trên cùng.`, { kind: 'reveal' });
    addPrivateLog(
      gameState,
      [playerId],
      `Bạn thấy: ${top.map(card => card.nameVN).join(' → ')}.`,
      { kind: 'reveal', cards: top.map(cardView) }
    );
    return { gameState, response: { type: 'choice_request', playerId } };
  },

  [CARD_TYPES.SIEU_HUY_BAI]: (gameState, playerId) => {
    const player = playerOf(gameState, playerId);
    const next = nextAlivePlayer(gameState);
    if (!next) {
      addPublicLog(gameState, `🧨 ${player.name} dùng Siêu Hủy Bài nhưng không còn đối thủ.`);
      return { gameState, response: { type: 'card_played', playerId } };
    }
    const nextIndex = gameState.players.findIndex(p => p.id === next.id);
    const afterNext = nextAlivePlayer(gameState, nextIndex);
    gameState.currentPlayerIndex = afterNext
      ? gameState.players.findIndex(p => p.id === afterNext.id)
      : nextIndex;
    gameState.turnsRemaining = 1;
    gameState.fueledPlayerId = null;
    gameState.alterFuture = null;
    gameState.lastAttack = null;
    addPublicLog(gameState, `🧨 ${player.name} dừng lượt của ${next.name}.`);
    return {
      gameState,
      response: { type: 'card_played', playerId, skippedPlayerId: next.id },
    };
  },

  [CARD_TYPES.SIEU_THU_CUNG]: (gameState, playerId) => {
    const player = playerOf(gameState, playerId);
    const card = gameState.drawPile.shift();
    if (card) player.hand.push(card);
    addPublicLog(gameState, `🐾 ${player.name} dùng Siêu Thú Cưng và rút 1 lá.`, {
      kind: 'draw',
    });
    if (card) {
      addPrivateLog(gameState, [playerId], `Bạn đã rút được ${card.nameVN}.`, {
        kind: 'draw',
        cards: [cardView(card)],
      });
    }
    return { gameState, response: { type: 'drew_card', playerId } };
  },

  [CARD_TYPES.CHIA_SE]: (gameState, playerId, payload) => {
    const player = playerOf(gameState, playerId);
    const target = chosenTarget(gameState, playerId, payload);
    if (!target || target.hand.length === 0) {
      addPublicLog(gameState, `🍕 ${player.name} dùng Chia Sẻ nhưng ${target?.name || 'mục tiêu'} không còn bài.`);
      return { gameState, response: { type: 'card_played', playerId } };
    }
    const count = Math.min(
      target.hand.length,
      Math.ceil(target.hand.length / 2) * (payload?.boostMultiplier || 1)
    );
    setChoice(gameState, {
      playerId: target.id,
      kind: 'discard_half_pick',
      sourceType: CARD_TYPES.CHIA_SE,
      cards: target.hand.map(cardView),
      count,
    });
    addPublicLog(gameState, `🍕 ${target.name} đang tự chọn ${count} lá để hủy.`);
    return { gameState, response: { type: 'choice_request', playerId: target.id } };
  },

  [CARD_TYPES.GIO_GIAI_LAO]: (gameState, playerId, payload) => {
    const player = playerOf(gameState, playerId);
    const target = chosenTarget(gameState, playerId, payload);
    if (!target || target.hand.length === 0) {
      addPublicLog(gameState, `🐼 ${player.name} dùng Giờ Giải Lao nhưng ${target?.name || 'mục tiêu'} không còn bài.`);
      return { gameState, response: { type: 'card_played', playerId } };
    }
    const count = Math.min(3 * (payload?.boostMultiplier || 1), target.hand.length);
    setChoice(gameState, {
      playerId,
      kind: 'reveal_pick',
      sourceType: CARD_TYPES.GIO_GIAI_LAO,
      targetPlayerId: target.id,
      targetName: target.name,
      cardCount: target.hand.length,
      count,
    });
    addPublicLog(gameState, `🐼 ${player.name} đang chọn ${count} lá úp của ${target.name} để xem.`);
    return { gameState, response: { type: 'choice_request', playerId } };
  },

  [CARD_TYPES.TAN_CONG_CHI_DINH]: (gameState, playerId, payload) => {
    const player = playerOf(gameState, playerId);
    const target = chosenTarget(gameState, playerId, payload);
    if (!target) return { gameState, response: { error: 'Không có mục tiêu hợp lệ' } };
    const turns = 2 * (payload?.boostMultiplier || 1);
    gameState.currentPlayerIndex = gameState.players.findIndex(p => p.id === target.id);
    gameState.turnsRemaining = turns;
    gameState.fueledPlayerId = null;
    gameState.alterFuture = null;
    gameState.lastAttack = { attackerId: playerId, targetId: target.id, turns };
    addPublicLog(gameState, `🎯 ${player.name} chỉ định ${target.name} bốc ${turns} lượt.`);
    return { gameState, response: { type: 'attack', playerId, targetPlayerId: target.id, turnsRemaining: turns } };
  },

  [CARD_TYPES.BOC_DUOI_DAY]: (gameState, playerId) => {
    const player = playerOf(gameState, playerId);
    const card = gameState.drawPile.pop();
    if (!card) return { gameState, response: { error: 'Chồng bài rút đang trống' } };
    drawFromPile(gameState, player, card);
    addPublicLog(gameState, `⬇️ ${player.name} đã bốc lá dưới đáy.`, { kind: 'draw' });
    addPrivateLog(gameState, [playerId], `Bạn đã rút được ${card.nameVN} dưới đáy.`, {
      kind: 'draw',
      cards: [cardView(card)],
    });
    return { gameState, response: { type: 'drew_card', playerId } };
  },

  [CARD_TYPES.VUONG_NIEM]: (gameState, playerId) => {
    const player = playerOf(gameState, playerId);
    addPublicLog(gameState, `👑 ${player.name} dùng Vương Niệm.`);
    return { gameState, response: { type: 'card_played', playerId } };
  },

  [CARD_TYPES.HUY_BAI]: (gameState, playerId, payload) => {
    const player = playerOf(gameState, playerId);
    const target = chosenTarget(gameState, playerId, payload);
    if (!target || target.hand.length === 0) {
      addPublicLog(gameState, `🥊 ${player.name} dùng Hủy Bài nhưng ${target?.name || 'mục tiêu'} không còn bài.`);
      return { gameState, response: { type: 'card_played', playerId } };
    }
    const count = Math.min(target.hand.length, 2 * (payload?.boostMultiplier || 1));
    setChoice(gameState, {
      playerId,
      kind: 'destroy_pick',
      sourceType: CARD_TYPES.HUY_BAI,
      targetPlayerId: target.id,
      targetName: target.name,
      cardCount: target.hand.length,
      count,
    });
    addPublicLog(gameState, `🥊 ${player.name} đang chọn ${count} lá úp của ${target.name}.`);
    return { gameState, response: { type: 'choice_request', playerId } };
  },

  [CARD_TYPES.TU_VA]: (gameState, playerId, payload) => {
    const player = playerOf(gameState, playerId);
    const extra = 3 * (payload?.boostMultiplier || 1);
    gameState.turnsRemaining = (gameState.turnsRemaining || 1) + extra;
    addPublicLog(gameState, `🐙 ${player.name} được thêm ${extra} lượt.`);
    return { gameState, response: { type: 'card_played', playerId } };
  },

  [CARD_TYPES.TAN_CONG_BAN_THAN]: (gameState, playerId, payload) => {
    const player = playerOf(gameState, playerId);
    const turns = 3 * (payload?.boostMultiplier || 1);
    gameState.turnsRemaining = turns;
    addPublicLog(gameState, `🦫 ${player.name} tự tấn công và phải bốc ${turns} lượt liên tục.`);
    return { gameState, response: { type: 'card_played', playerId } };
  },

  [CARD_TYPES.THOI_MIEN]: (gameState, playerId, payload) => {
    const player = playerOf(gameState, playerId);
    const target = chosenTarget(gameState, playerId, payload);
    const cards = (target?.hand || []).map(cardView);
    addPublicLog(gameState, `🦈 ${player.name} xem toàn bộ bài của ${target?.name || 'đối thủ'}.`, {
      kind: 'reveal',
    });
    addPrivateLog(
      gameState,
      [playerId],
      `Bạn thấy: ${cards.map(card => card.nameVN).join(', ')}.`,
      { kind: 'reveal', cards }
    );
    return {
      gameState,
      response: {
        type: 'see_the_future',
        forPlayer: playerId,
        cards,
      },
    };
  },

  [CARD_TYPES.LAM_PHIEN]: (gameState, playerId, payload) => {
    const player = playerOf(gameState, playerId);
    const target = chosenTarget(gameState, playerId, payload);
    if (!target || target.hand.length === 0) {
      return { gameState, response: { error: 'Mục tiêu không còn lá bài nào' } };
    }
    setChoice(gameState, {
      playerId,
      kind: 'disable_card',
      sourceType: CARD_TYPES.LAM_PHIEN,
      targetPlayerId: target.id,
      targetName: target.name,
      cardCount: target.hand.length,
    });
    addPublicLog(gameState, `🐱 ${player.name} đang chọn 1 lá của ${target.name} để vô hiệu hóa.`);
    return { gameState, response: { type: 'choice_request', playerId } };
  },

  [CARD_TYPES.NHAN_BAN]: (gameState, playerId, payload) => {
    const player = playerOf(gameState, playerId);
    const target = chosenTarget(gameState, playerId, payload);
    if (!target) return { gameState, response: { error: 'Không có mục tiêu hợp lệ' } };
    if (takeVuongNiem(gameState, target)) {
      return {
        gameState,
        response: { type: 'vuong_niem_blocked', playerId, targetPlayerId: target.id, targetName: target.name },
      };
    }
    target.pendingStealBy = playerId;
    addPublicLog(gameState, `🐻 ${player.name} đặt Nhân Bản trước ${target.name}; lá họ rút tiếp theo sẽ bị cướp.`);
    return { gameState, response: { type: 'card_played', playerId, targetPlayerId: target.id } };
  },

  [CARD_TYPES.TO_SE_LAY_NO]: (gameState, playerId, payload) => {
    const player = playerOf(gameState, playerId);
    const target = chosenTarget(gameState, playerId, payload);
    if (!target) return { gameState, response: { error: 'Không có mục tiêu hợp lệ' } };
    if (takeVuongNiem(gameState, target)) {
      return {
        gameState,
        response: { type: 'vuong_niem_blocked', playerId, targetPlayerId: target.id, targetName: target.name },
      };
    }
    target.pendingStealBy = playerId;
    addPublicLog(gameState, `🪲 ${player.name} nhắm ${target.name}; lá họ rút tiếp theo sẽ bị lấy.`);
    return { gameState, response: { type: 'card_played', playerId, targetPlayerId: target.id } };
  },

  [CARD_TYPES.TIEC_TUNG]: (gameState, playerId) => {
    const player = playerOf(gameState, playerId);
    const queue = partyQueue(gameState, playerId);
    if (queue.length === 0) {
      addPublicLog(gameState, `🎂 ${player.name} mở tiệc nhưng không ai còn bài để úp.`);
      return { gameState, response: { type: 'card_played', playerId } };
    }
    gameState.pendingParty = { queue, index: 0 };
    addPublicLog(gameState, `🎂 ${player.name} mở tiệc; mỗi người tự chọn 1 lá úp lên đầu chồng bài.`);
    return openPartyChoice(gameState);
  },

  [CARD_TYPES.HOI_SINH]: (gameState, playerId, payload) => {
    const player = playerOf(gameState, playerId);
    const eliminated = gameState.players.filter(p => !p.isAlive && p.hand?.length > 0);
    const cards = eliminated.flatMap(target =>
      target.hand.map(card => ({
        ...cardView(card),
        ownerId: target.id,
        ownerName: target.name,
      }))
    );
    if (cards.length === 0) {
      return { gameState, response: { error: 'Không có người chơi bị loại nào còn bài' } };
    }
    const count = Math.min(2 * (payload?.boostMultiplier || 1), cards.length);
    setChoice(gameState, {
      playerId,
      kind: 'revive_cards',
      sourceType: CARD_TYPES.HOI_SINH,
      cards,
      count,
    });
    addPublicLog(gameState, `🌱 ${player.name} đang chọn ${count} lá từ người đã loại.`);
    return { gameState, response: { type: 'choice_request', playerId } };
  },

  [CARD_TYPES.NAP_NHIEN_LIEU]: (gameState, playerId) => {
    const player = playerOf(gameState, playerId);
    if (gameState.napNhienLieuUsed) {
      return { gameState, response: { error: 'Nạp Nhiên Liệu chỉ được dùng 1 lần mỗi ván' } };
    }
    gameState.napNhienLieuUsed = true;
    const recyclable = gameState.discardPile.filter(c => c.type !== CARD_TYPES.EXPLODING_KITTEN && c.type !== CARD_TYPES.IMPLODING_KITTEN);
    gameState.discardPile = gameState.discardPile.filter(c => c.type === CARD_TYPES.EXPLODING_KITTEN || c.type === CARD_TYPES.IMPLODING_KITTEN);
    gameState.drawPile = shuffleDeck([...gameState.drawPile, ...recyclable]);
    finishTurn(gameState);
    addPublicLog(gameState, `⛽ ${player.name} nạp lại bài đã dùng và kết thúc lượt.`);
    return { gameState, response: { type: 'card_played', playerId } };
  },

  [CARD_TYPES.BOC_O_DAU_CUNG_DUOC]: (gameState, playerId) => {
    const player = playerOf(gameState, playerId);
    if (gameState.drawPile.length === 0) return { gameState, response: { error: 'Chồng bài rút đang trống' } };
    setChoice(gameState, {
      playerId,
      kind: 'position_draw',
      sourceType: CARD_TYPES.BOC_O_DAU_CUNG_DUOC,
      maxPosition: gameState.drawPile.length - 1,
    });
    addPublicLog(gameState, `🦜 ${player.name} đang chọn vị trí bốc bài.`);
    return { gameState, response: { type: 'choice_request', playerId } };
  },

  [CARD_TYPES.TANG_CUONG]: (gameState, playerId) => {
    const player = playerOf(gameState, playerId);
    const card = gameState.drawPile.shift();
    if (card) player.hand.push(card);
    addPublicLog(gameState, `🐰 ${player.name} tăng cường và rút 1 lá.`, { kind: 'draw' });
    if (card) {
      addPrivateLog(gameState, [playerId], `Bạn đã rút được ${card.nameVN}.`, {
        kind: 'draw',
        cards: [cardView(card)],
      });
    }
    return { gameState, response: { type: 'drew_card', playerId } };
  },

  [CARD_TYPES.TRA_DUA]: () => ({
    response: { error: 'Trả Đũa chỉ dùng khi bạn vừa bị cướp bài' },
  }),

  [CARD_TYPES.MOC_RAC]: () => ({
    response: { error: 'Móc Rác chỉ dùng khi bạn vừa bị cướp bài' },
  }),

  [CARD_TYPES.SAO_CHEP]: (gameState, playerId) => {
    const player = playerOf(gameState, playerId);
    const card = gameState.drawPile.shift();
    if (card) player.hand.push(card);
    addPublicLog(gameState, `🐊 ${player.name} sao chép và rút 1 lá.`, { kind: 'draw' });
    if (card) {
      addPrivateLog(gameState, [playerId], `Bạn đã rút được ${card.nameVN}.`, {
        kind: 'draw',
        cards: [cardView(card)],
      });
    }
    return { gameState, response: { type: 'drew_card', playerId } };
  },

  [CARD_TYPES.NHIN_THAU_TUONG_LAI]: (gameState, playerId) => {
    const cards = gameState.drawPile.slice(0, 5).map(cardView);
    addPublicLog(gameState, `📸 Người chơi đã Nhìn Thấu Tương Lai.`, { kind: 'reveal' });
    addPrivateLog(
      gameState,
      [playerId],
      `Bạn thấy: ${cards.map(card => card.nameVN).join(' → ')}.`,
      { kind: 'reveal', cards }
    );
    return { gameState, response: { type: 'see_the_future', forPlayer: playerId, cards } };
  },

  [CARD_TYPES.CHONG_XAO_BAI]: (gameState, playerId) => {
    const player = playerOf(gameState, playerId);
    addPublicLog(gameState, `🐉 ${player.name} dùng Chống Xào Bài.`);
    return { gameState, response: { type: 'card_played', playerId } };
  },

  [CARD_TYPES.TIET_LO_TUONG_LAI]: (gameState, playerId) => {
    const player = playerOf(gameState, playerId);
    addPublicLog(gameState, `🐘 ${player.name} đã Tiết Lộ Tương Lai.`);
    return handleAlterFuture(gameState, playerId);
  },
};

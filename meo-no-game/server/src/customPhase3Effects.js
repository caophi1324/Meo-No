import { CARD_TYPES } from '../../shared/cardTypes.js';
import { advanceTurn, handleAlterFuture, nextAlivePlayer, setChoice, takeVuongNiem } from './cardEffects.js';
import { shuffleDeck } from './deckBuilder.js';

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

function discardRandom(gameState, target, count) {
  let removed = 0;
  for (let i = 0; i < count && target.hand.length > 0; i++) {
    const index = Math.floor(Math.random() * target.hand.length);
    const [card] = target.hand.splice(index, 1);
    gameState.discardPile.push(card);
    removed += 1;
  }
  return removed;
}

function stealRandom(gameState, actor, target, count) {
  if (takeVuongNiem(gameState, target)) return 0;
  let stolen = 0;
  for (let i = 0; i < count && target.hand.length > 0; i++) {
    const index = Math.floor(Math.random() * target.hand.length);
    const [card] = target.hand.splice(index, 1);
    actor.hand.push(card);
    stolen += 1;
  }
  return stolen;
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
      cards: [{ id: card.id, type: card.type, nameVN: card.nameVN, emoji: card.emoji }],
    });
    gameState.gameLog.push(`🔎 ${player.name} đang xem lá trên cùng và chọn vị trí đặt lại.`);
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
      cards: top.map(c => ({
        id: c.id,
        type: c.type,
        nameVN: c.nameVN,
        emoji: c.emoji,
      })),
    });
    gameState.gameLog.push(`🔎 ${player.name} đang xem 5 lá trên cùng.`);
    return { gameState, response: { type: 'choice_request', playerId } };
  },

  [CARD_TYPES.SIEU_HUY_BAI]: (gameState, playerId) => {
    const player = playerOf(gameState, playerId);
    const next = nextAlivePlayer(gameState);
    if (!next) {
      gameState.gameLog.push(`🧨 ${player.name} dùng Siêu Hủy Bài nhưng không còn đối thủ.`);
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
    gameState.gameLog.push(`🧨 ${player.name} dừng lượt của ${next.name}.`);
    return {
      gameState,
      response: { type: 'card_played', playerId, skippedPlayerId: next.id },
    };
  },

  [CARD_TYPES.SIEU_THU_CUNG]: (gameState, playerId) => {
    const player = playerOf(gameState, playerId);
    const card = gameState.drawPile.shift();
    if (card) player.hand.push(card);
    gameState.gameLog.push(`🐾 ${player.name} dùng Siêu Thú Cưng và rút 1 lá.`);
    return { gameState, response: { type: 'drew_card', playerId } };
  },

  [CARD_TYPES.CHIA_SE]: (gameState, playerId, payload) => {
    const player = playerOf(gameState, playerId);
    const target = chosenTarget(gameState, playerId, payload);
    if (target) {
      const count = Math.ceil(target.hand.length / 2) * (payload?.boostMultiplier || 1);
      const removed = discardRandom(gameState, target, Math.min(count, target.hand.length));
      gameState.gameLog.push(`🍕 ${player.name} khiến ${target.name} bỏ ${removed} lá.`);
    }
    return { gameState, response: { type: 'card_played', playerId } };
  },

  [CARD_TYPES.GIO_GIAI_LAO]: (gameState, playerId, payload) => {
    const player = playerOf(gameState, playerId);
    const target = chosenTarget(gameState, playerId, payload);
    const cards = target
      ? [...target.hand].sort(() => Math.random() - 0.5).slice(0, 3 * (payload?.boostMultiplier || 1))
      : [];
    gameState.gameLog.push(`🐼 ${player.name} xem 3 lá của ${target?.name || 'đối thủ'}.`);
    return {
      gameState,
      response: {
        type: 'see_the_future',
        forPlayer: playerId,
        cards: cards.map(c => ({ id: c.id, type: c.type, nameVN: c.nameVN, emoji: c.emoji })),
      },
    };
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
    gameState.gameLog.push(`🎯 ${player.name} chỉ định ${target.name} bốc ${turns} lượt.`);
    return { gameState, response: { type: 'attack', playerId, targetPlayerId: target.id, turnsRemaining: turns } };
  },

  [CARD_TYPES.BOC_DUOI_DAY]: (gameState, playerId) => {
    const player = playerOf(gameState, playerId);
    const card = gameState.drawPile.pop();
    if (!card) return { gameState, response: { error: 'Chồng bài rút đang trống' } };
    drawFromPile(gameState, player, card);
    gameState.gameLog.push(`⬇️ ${player.name} đã bốc lá dưới đáy.`);
    return { gameState, response: { type: 'drew_card', playerId } };
  },

  [CARD_TYPES.VUONG_NIEM]: (gameState, playerId) => {
    const player = playerOf(gameState, playerId);
    gameState.gameLog.push(`👑 ${player.name} dùng Vương Niệm.`);
    return { gameState, response: { type: 'card_played', playerId } };
  },

  [CARD_TYPES.HUY_BAI]: (gameState, playerId, payload) => {
    const player = playerOf(gameState, playerId);
    const target = chosenTarget(gameState, playerId, payload);
    const removed = target
      ? discardRandom(gameState, target, 2 * (payload?.boostMultiplier || 1))
      : 0;
    gameState.gameLog.push(`🥊 ${player.name} hủy ${removed} lá của ${target?.name || 'đối thủ'}.`);
    return { gameState, response: { type: 'card_played', playerId } };
  },

  [CARD_TYPES.TU_VA]: (gameState, playerId, payload) => {
    const player = playerOf(gameState, playerId);
    const extra = 3 * (payload?.boostMultiplier || 1);
    gameState.turnsRemaining = (gameState.turnsRemaining || 1) + extra;
    gameState.gameLog.push(`🐙 ${player.name} được thêm ${extra} lượt.`);
    return { gameState, response: { type: 'card_played', playerId } };
  },

  [CARD_TYPES.TAN_CONG_BAN_THAN]: (gameState, playerId, payload) => {
    const player = playerOf(gameState, playerId);
    const turns = 3 * (payload?.boostMultiplier || 1);
    gameState.turnsRemaining = turns;
    gameState.gameLog.push(`🦫 ${player.name} tự tấn công và phải bốc ${turns} lượt liên tục.`);
    return { gameState, response: { type: 'card_played', playerId } };
  },

  [CARD_TYPES.THOI_MIEN]: (gameState, playerId, payload) => {
    const player = playerOf(gameState, playerId);
    const target = chosenTarget(gameState, playerId, payload);
    gameState.gameLog.push(`🦈 ${player.name} xem toàn bộ bài của ${target?.name || 'đối thủ'}.`);
    return {
      gameState,
      response: {
        type: 'see_the_future',
        forPlayer: playerId,
        cards: (target?.hand || []).map(c => ({ id: c.id, type: c.type, nameVN: c.nameVN, emoji: c.emoji })),
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
    gameState.gameLog.push(`🐱 ${player.name} đang chọn 1 lá của ${target.name} để vô hiệu hóa.`);
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
    gameState.gameLog.push(`🐻 ${player.name} đặt Nhân Bản trước ${target.name}; lá họ rút tiếp theo sẽ bị cướp.`);
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
    gameState.gameLog.push(`🪲 ${player.name} nhắm ${target.name}; lá họ rút tiếp theo sẽ bị lấy.`);
    return { gameState, response: { type: 'card_played', playerId, targetPlayerId: target.id } };
  },

  [CARD_TYPES.TIEC_TUNG]: (gameState, playerId) => {
    const player = playerOf(gameState, playerId);
    for (const p of gameState.players.filter(x => x.isAlive && x.hand.length > 0)) {
      const index = Math.floor(Math.random() * p.hand.length);
      const [card] = p.hand.splice(index, 1);
      gameState.drawPile.unshift(card);
    }
    gameState.gameLog.push(`🎂 ${player.name} mở tiệc; mỗi người đặt 1 lá lên đầu chồng bài.`);
    return { gameState, response: { type: 'card_played', playerId } };
  },

  [CARD_TYPES.HOI_SINH]: (gameState, playerId, payload) => {
    const player = playerOf(gameState, playerId);
    const eliminated = gameState.players.filter(p => !p.isAlive && p.hand?.length > 0);
    const cards = eliminated.flatMap(target =>
      target.hand.map(card => ({
        id: card.id,
        type: card.type,
        nameVN: card.nameVN,
        emoji: card.emoji,
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
    gameState.gameLog.push(`🌱 ${player.name} đang chọn ${count} lá từ người đã loại.`);
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
    gameState.gameLog.push(`⛽ ${player.name} nạp lại bài đã dùng và kết thúc lượt.`);
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
    gameState.gameLog.push(`🦜 ${player.name} đang chọn vị trí bốc bài.`);
    return { gameState, response: { type: 'choice_request', playerId } };
  },

  [CARD_TYPES.TANG_CUONG]: (gameState, playerId) => {
    const player = playerOf(gameState, playerId);
    const card = gameState.drawPile.shift();
    if (card) player.hand.push(card);
    gameState.gameLog.push(`🐰 ${player.name} tăng cường và rút 1 lá.`);
    return { gameState, response: { type: 'drew_card', playerId } };
  },

  [CARD_TYPES.TRA_DUA]: (gameState, playerId) => {
    const player = playerOf(gameState, playerId);
    const target = randomItem(opponentsOf(gameState, playerId));
    const stolen = target ? stealRandom(gameState, player, target, 2) : 0;
    gameState.gameLog.push(`🦍 ${player.name} trả đũa và lấy ${stolen} lá.`);
    return { gameState, response: { type: 'card_played', playerId } };
  },

  [CARD_TYPES.MOC_RAC]: (gameState, playerId) => {
    const player = playerOf(gameState, playerId);
    const target = randomItem(opponentsOf(gameState, playerId));
    const stolen = target ? stealRandom(gameState, player, target, 2) : 0;
    gameState.gameLog.push(`🦦 ${player.name} móc rác và lấy ${stolen} lá.`);
    return { gameState, response: { type: 'card_played', playerId } };
  },

  [CARD_TYPES.SAO_CHEP]: (gameState, playerId) => {
    const player = playerOf(gameState, playerId);
    const card = gameState.drawPile.shift();
    if (card) player.hand.push(card);
    gameState.gameLog.push(`🐊 ${player.name} sao chép và rút 1 lá.`);
    return { gameState, response: { type: 'drew_card', playerId } };
  },

  [CARD_TYPES.NHIN_THAU_TUONG_LAI]: (gameState, playerId) => {
    const cards = gameState.drawPile.slice(0, 5).map(c => ({
      id: c.id,
      type: c.type,
      nameVN: c.nameVN,
      emoji: c.emoji,
    }));
    gameState.gameLog.push(`📸 Người chơi đã Nhìn Thấu Tương Lai.`);
    return { gameState, response: { type: 'see_the_future', forPlayer: playerId, cards } };
  },

  [CARD_TYPES.CHONG_XAO_BAI]: (gameState, playerId) => {
    const player = playerOf(gameState, playerId);
    gameState.gameLog.push(`🐉 ${player.name} dùng Chống Xào Bài.`);
    return { gameState, response: { type: 'card_played', playerId } };
  },

  [CARD_TYPES.TIET_LO_TUONG_LAI]: (gameState, playerId) => {
    const player = playerOf(gameState, playerId);
    gameState.gameLog.push(`🐘 ${player.name} đã Tiết Lộ Tương Lai.`);
    return handleAlterFuture(gameState, playerId);
  },
};

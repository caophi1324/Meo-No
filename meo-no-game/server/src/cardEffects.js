import { CARD_TYPES, CAT_CARDS } from '../../shared/cardTypes.js';
import { shuffleDeck } from './deckBuilder.js';
import { addPrivateLog, addPublicLog } from './gameLog.js';

// Dữ liệu lá bài an toàn để gửi cho người được xem/chọn (không thêm gì bí mật).
export function cardView(card) {
  return {
    id: card.id,
    type: card.type,
    nameVN: card.nameVN,
    emoji: card.emoji,
    ...(card.lolImage ? { lolImage: card.lolImage, lolName: card.lolName, lolSkinName: card.lolSkinName } : {}),
  };
}

// ============================================================
// Chuyển lượt sang người kế tiếp còn sống.
// turnsForNext = số lượt người kế phải đi (Tấn Công → 2).
// ============================================================
export function nextAlivePlayer(gameState, fromIndex = gameState.currentPlayerIndex) {
  const len = gameState.players.length;
  const dir = gameState.direction === -1 ? -1 : 1;
  for (let step = 1; step <= len; step++) {
    const idx = (fromIndex + dir * step + len) % len;
    if (gameState.players[idx]?.isAlive) return gameState.players[idx];
  }
  return null;
}

export function previousAlivePlayer(gameState, fromIndex = gameState.currentPlayerIndex) {
  const len = gameState.players.length;
  const dir = gameState.direction === -1 ? -1 : 1;
  for (let step = 1; step <= len; step++) {
    const idx = (fromIndex - dir * step + len * step) % len;
    if (gameState.players[idx]?.isAlive) return gameState.players[idx];
  }
  return null;
}

export function advanceTurn(gameState, turnsForNext = 1) {
  const alive = gameState.players.filter(p => p.isAlive);
  if (alive.length <= 1) {
    gameState.waitingFor = null;
    gameState.pendingAction = null;
    gameState.nopeCount = 0;
    gameState.nopePassed = [];
    gameState.windowOwnerId = null;
    return;
  }

  // Hết lượt của người đang đi: mở khóa các lá bị Làm Phiền.
  const leaving = gameState.players[gameState.currentPlayerIndex];
  if (leaving?.hand) {
    for (const card of leaving.hand) {
      if (card.disabled) delete card.disabled;
    }
  }
  gameState.pendingChoice = null;
  gameState.turnNumber = (gameState.turnNumber || 0) + 1;

  const len = gameState.players.length;
  const dir = gameState.direction === -1 ? -1 : 1;
  let idx = (gameState.currentPlayerIndex + dir + len) % len;
  while (!gameState.players[idx].isAlive) {
    idx = (idx + dir + len) % len;
  }
  gameState.currentPlayerIndex = idx;
  gameState.turnsRemaining = turnsForNext;
  gameState.waitingFor = null;
  gameState.pendingAction = null;
  gameState.nopeCount = 0;
  gameState.nopePassed = [];
  gameState.windowOwnerId = null;
  gameState.favorTarget = null;
  gameState.favorRequester = null;
  gameState.lastAttack = null;
  gameState.fueledPlayerId = null;
  gameState.alterFuture = null;
}

export function setChoice(gameState, choice) {
  gameState.pendingChoice = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    ...choice,
  };
  gameState.waitingFor = 'choice';
  return gameState.pendingChoice;
}

export function takeVuongNiem(gameState, player) {
  const index = player?.hand?.findIndex(c => c.type === CARD_TYPES.VUONG_NIEM && !c.disabled) ?? -1;
  if (!player || index === -1) return null;
  const [card] = player.hand.splice(index, 1);
  gameState.discardPile.push(card);
  addPublicLog(gameState, `👑 ${player.name} dùng Vương Niệm để chặn 1 lá và mất hiệu lực.`);
  return card;
}

function clearWindow(gameState) {
  gameState.waitingFor = null;
  gameState.pendingAction = null;
  gameState.nopeCount = 0;
  gameState.nopePassed = [];
  gameState.windowOwnerId = null;
}

// ⚔️ Tấn Công: kết thúc lượt NGAY (không rút bài), người kế phải đi 2 lượt
export function handleAttack(gameState, playerId, payload = {}) {
  const current = gameState.players[gameState.currentPlayerIndex];
  if (current.id !== playerId) return { gameState, response: { error: 'Không phải lượt của bạn' } };

  const fueled = gameState.fueledPlayerId === playerId;
  const base = fueled ? 3 : 2;
  const carried =
    gameState.lastAttack?.targetId === playerId
      ? Math.max(0, gameState.turnsRemaining || 0)
      : gameState.turnsRemaining > 1
        ? gameState.turnsRemaining
        : 0;
  const turns = carried + base * (payload.boostMultiplier || 1);
  const target = nextAlivePlayer(gameState);
  advanceTurn(gameState, turns);
  if (target) {
    gameState.lastAttack = { attackerId: playerId, targetId: target.id, turns };
  }
  addPublicLog(gameState,
    `⚔️ ${current.name} đã Tấn Công ${target ? target.name : ''}! Người kế tiếp phải đi ${turns} lượt${fueled ? ' (đã nạp nhiên liệu)' : ''}.`
  );
  return {
    gameState,
    response: {
      type: 'attack',
      playerId,
      targetPlayerId: target?.id || null,
      targetName: target?.name || null,
      turnsRemaining: gameState.turnsRemaining,
      carried,
      fueled,
    },
  };
}

// ⏭️ Bỏ Lượt: giảm 1 lượt; nếu hết lượt → chuyển người kế
export function handleSkip(gameState, playerId) {
  const current = gameState.players[gameState.currentPlayerIndex];
  if (current.id !== playerId) return { gameState, response: { error: 'Không phải lượt của bạn' } };

  gameState.turnsRemaining = 0;
  clearWindow(gameState);
  advanceTurn(gameState, 1);
  addPublicLog(gameState, `⏭️ ${current.name} đã Bỏ Lượt.`);
  return { gameState, response: { type: 'skip', playerId } };
}

// 🔀 Xáo Trộn: xáo ngẫu nhiên chồng bài rút
export function handleShuffle(gameState, playerId) {
  const player = gameState.players.find(p => p.id === playerId);
  gameState.drawPile = shuffleDeck(gameState.drawPile);
  clearWindow(gameState);
  addPublicLog(gameState, `🔀 ${player ? player.name : 'Ai đó'} đã Xáo Trộn chồng bài.`);
  return { gameState, response: { type: 'shuffle', playerId } };
}

// 🔮 Nhìn Tương Lai: trả 3 lá trên cùng — CHỈ cho người chơi này (không broadcast)
export function handleSeeTheFuture(gameState, playerId) {
  const player = gameState.players.find(p => p.id === playerId);
  const top3 = gameState.drawPile.slice(0, 3).map(cardView);
  addPublicLog(gameState, `🔮 ${player ? player.name : 'Ai đó'} đã Nhìn Tương Lai.`, {
    kind: 'reveal',
  });
  addPrivateLog(
    gameState,
    [playerId],
    `Bạn thấy: ${top3.map(card => card.nameVN).join(' → ')}.`,
    { kind: 'reveal', cards: top3 }
  );
  return { gameState, response: { type: 'see_the_future', cards: top3, forPlayer: playerId } };
}

// 🔄 Đảo Chiều: đổi hướng lượt. Chỉ còn 2 người thì tính như Bỏ Lượt.
export function handleReverse(gameState, playerId) {
  const player = gameState.players.find(p => p.id === playerId);
  const aliveCount = gameState.players.filter(p => p.isAlive).length;

  if (aliveCount > 2) {
    gameState.direction = gameState.direction === -1 ? 1 : -1;
  }
  gameState.turnsRemaining = 0;
  clearWindow(gameState);
  advanceTurn(gameState, 1);
  addPublicLog(gameState,
    `🔄 ${player ? player.name : 'Ai đó'} đã Đảo Chiều và kết thúc lượt.`
  );
  return {
    gameState,
    response: {
      type: 'reverse',
      playerId,
      direction: gameState.direction,
      twoPlayerSkip: aliveCount <= 2,
    },
  };
}

// 🐧 Trộm Bài: cướp 1 lá ngẫu nhiên từ đối thủ còn sống.
export function handleStealCard(gameState, playerId, targetPlayerId) {
  const player = gameState.players.find(p => p.id === playerId);
  const target = gameState.players.find(p => p.id === targetPlayerId);
  if (!player || !target || !target.isAlive || target.id === playerId || target.hand.length === 0) {
    return { gameState, response: { error: 'Cần chọn đối thủ còn bài để trộm' } };
  }
  clearWindow(gameState);
  if (takeVuongNiem(gameState, target)) {
    return {
      gameState,
      response: {
        type: 'vuong_niem_blocked',
        playerId,
        targetPlayerId: target.id,
        targetName: target.name,
      },
    };
  }
  setChoice(gameState, {
    playerId,
    kind: 'steal_pick',
    sourceType: CARD_TYPES.STEAL_CARD,
    targetPlayerId: target.id,
    targetName: target.name,
    cardCount: target.hand.length,
  });
  addPublicLog(gameState, `🐧 ${player.name} đang chọn 1 lá úp từ ${target.name}.`, {
    kind: 'steal',
  });
  return { gameState, response: { type: 'choice_request', playerId } };
}

// Mở cửa sổ phản đòn ngay sau khi một người bị cướp.
export function offerReaction(gameState, victim, thief) {
  if (!victim || !thief || victim.id === thief.id) return;
  const options = victim.hand
    .filter(c => !c.disabled && [CARD_TYPES.TRA_DUA, CARD_TYPES.MOC_RAC].includes(c.type))
    .map(cardView);
  if (options.length === 0) return;
  setChoice(gameState, {
    playerId: victim.id,
    kind: 'reaction',
    thiefId: thief.id,
    cards: options,
  });
  addPublicLog(gameState, `🛡️ ${victim.name} có thể phản đòn ${thief.name}.`);
}

// ☢️ Boom Nguyên Tử: gom bài đã dùng trở lại chồng rút rồi kết thúc lượt.
export function handleBoomAtomic(gameState, playerId) {
  const player = gameState.players.find(p => p.id === playerId);
  const keep = gameState.discardPile.filter(
    c => c.type === CARD_TYPES.EXPLODING_KITTEN || c.type === CARD_TYPES.IMPLODING_KITTEN
  );
  const recyclable = gameState.discardPile.filter(
    c => c.type !== CARD_TYPES.EXPLODING_KITTEN && c.type !== CARD_TYPES.IMPLODING_KITTEN
  );
  gameState.discardPile = keep;
  gameState.drawPile = shuffleDeck([...gameState.drawPile, ...recyclable]);
  gameState.turnsRemaining = 0;
  clearWindow(gameState);
  advanceTurn(gameState, 1);
  addPublicLog(gameState, `☢️ ${player ? player.name : 'Ai đó'} đã dùng Boom Nguyên Tử và kết thúc lượt.`);
  return { gameState, response: { type: 'boom_atomic', playerId } };
}

// ⏩ Siêu Bỏ Lượt: kết thúc toàn bộ lượt còn lại, không rút bài.
export function handleSuperSkip(gameState, playerId) {
  const player = gameState.players.find(p => p.id === playerId);
  gameState.turnsRemaining = 0;
  clearWindow(gameState);
  advanceTurn(gameState, 1);
  addPublicLog(gameState,
    `⏩ ${player ? player.name : 'Ai đó'} đã Siêu Bỏ Lượt — kết thúc mọi lượt còn lại!`
  );
  return { gameState, response: { type: 'super_skip', playerId } };
}

// 🌌 Kiến Tạo Tương Lai: xem 3 lá trên cùng và sắp xếp lại.
export function handleAlterFuture(gameState, playerId) {
  const player = gameState.players.find(p => p.id === playerId);
  const cards = gameState.drawPile.slice(0, 3).map(cardView);
  gameState.waitingFor = 'alter_future';
  gameState.alterFuture = { playerId, cardIds: cards.map(c => c.id) };
  gameState.nopeCount = 0;
  gameState.nopePassed = [];
  gameState.windowOwnerId = null;
  addPublicLog(gameState, `🌌 ${player ? player.name : 'Ai đó'} đang Kiến Tạo Tương Lai...`, {
    kind: 'reveal',
  });
  addPrivateLog(
    gameState,
    [playerId],
    `Bạn thấy: ${cards.map(card => card.nameVN).join(' → ')}.`,
    { kind: 'reveal', cards }
  );
  return {
    gameState,
    response: { type: 'alter_future', playerId, cards, forPlayer: playerId },
  };
}

export function handleAlterFutureSubmit(gameState, playerId, order) {
  if (gameState.waitingFor !== 'alter_future' || !gameState.alterFuture) {
    return { gameState, response: { error: 'Hiện không có ai đang sắp xếp tương lai' } };
  }
  if (gameState.alterFuture.playerId !== playerId) {
    return { gameState, response: { error: 'Bạn không phải người sắp xếp tương lai' } };
  }

  const expected = gameState.alterFuture.cardIds;
  const wanted = Array.isArray(order) ? order.map(String) : [];
  const valid =
    wanted.length === expected.length &&
    new Set(wanted).size === wanted.length &&
    expected.every(id => wanted.includes(id));
  if (!valid) {
    return { gameState, response: { error: 'Thứ tự bài không hợp lệ' } };
  }

  const top = gameState.drawPile.slice(0, expected.length);
  const byId = new Map(top.map(c => [c.id, c]));
  gameState.drawPile = [
    ...wanted.map(id => byId.get(id)),
    ...gameState.drawPile.slice(expected.length),
  ];
  gameState.waitingFor = null;
  gameState.alterFuture = null;

  const player = gameState.players.find(p => p.id === playerId);
  addPublicLog(gameState, `🌌 ${player ? player.name : 'Ai đó'} đã sắp xếp lại 3 lá tương lai.`);
  return { gameState, response: { type: 'alter_future_placed', playerId } };
}

// ⛽ Nạp Nhiên Liệu: lá Tấn Công kế tiếp gây 3 lượt.
export function handleFuel(gameState, playerId) {
  const player = gameState.players.find(p => p.id === playerId);
  if (gameState.fueledPlayerId === playerId) {
    return { gameState, response: { error: 'Bạn đã nạp nhiên liệu rồi' } };
  }
  clearWindow(gameState);
  gameState.fueledPlayerId = playerId;
  addPublicLog(gameState,
    `⛽ ${player ? player.name : 'Ai đó'} đã Nạp Nhiên Liệu — Tấn Công kế tiếp gây 3 lượt!`
  );
  return { gameState, response: { type: 'fuel', playerId } };
}

// 🧨 Siêu Hủy Bài: hủy vĩnh viễn 1 lá thuộc loại bị chỉ định trên tay đối thủ.
export function handleSuperDestroy(gameState, playerId, targetPlayerId, requestedCardType) {
  const player = gameState.players.find(p => p.id === playerId);
  const target = gameState.players.find(p => p.id === targetPlayerId);
  if (!target || !target.isAlive || target.id === playerId) {
    return { gameState, response: { error: 'Cần chọn đối thủ hợp lệ' } };
  }
  if (!requestedCardType) {
    return { gameState, response: { error: 'Chưa chọn loại bài muốn hủy' } };
  }

  const idx = target.hand.findIndex(c => c.type === requestedCardType);
  if (idx === -1) {
    addPublicLog(gameState,
      `🧨 ${player ? player.name : 'Ai đó'} đã Siêu Hủy Bài nhưng ${target.name} không có lá đó.`
    );
    return {
      gameState,
      response: {
        type: 'super_destroy',
        playerId,
        targetPlayerId: target.id,
        targetName: target.name,
        requestedCardType,
        destroyed: false,
      },
    };
  }

  const [destroyed] = target.hand.splice(idx, 1);
  addPublicLog(gameState, `🧨 ${player ? player.name : 'Ai đó'} đã hủy 1 lá của ${target.name}.`, {
    kind: 'destroy',
  });
  addPrivateLog(
    gameState,
    [playerId, target.id],
    `${player ? player.name : 'Ai đó'} đã hủy ${destroyed.nameVN} của ${target.name}.`,
    { kind: 'destroy', cards: [cardView(destroyed)] }
  );
  return {
    gameState,
    response: {
      type: 'super_destroy',
      playerId,
      targetPlayerId: target.id,
      targetName: target.name,
      requestedCardType,
      destroyed: true,
      cardType: destroyed.type,
    },
  };
}

// 🙏 Xin Bài: mục tiêu PHẢI giao 1 lá (họ tự chọn)
export function handleFavor(gameState, playerId, targetPlayerId) {
  const target = gameState.players.find(p => p.id === targetPlayerId);
  if (!target || !target.isAlive) return { gameState, response: { error: 'Người chơi mục tiêu không tồn tại' } };
  if (target.id === playerId) return { gameState, response: { error: 'Không thể xin bài của chính mình' } };
  if (takeVuongNiem(gameState, target)) {
    return {
      gameState,
      response: {
        type: 'vuong_niem_blocked',
        playerId,
        targetPlayerId: target.id,
        targetName: target.name,
      },
    };
  }

  const requester = gameState.players.find(p => p.id === playerId);
  gameState.waitingFor = 'favor_give';
  gameState.favorTarget = targetPlayerId;
  gameState.favorRequester = playerId;
  addPublicLog(gameState, `🙏 ${requester ? requester.name : 'Ai đó'} đã Xin Bài từ ${target.name}.`);
  return { gameState, response: { type: 'favor_request', requester: playerId, target: targetPlayerId } };
}

// Giao bài cho người đã Xin Bài (chỉ đúng người bị xin mới gọi được)
export function handleFavorGive(gameState, targetPlayerId, cardId) {
  if (gameState.waitingFor !== 'favor_give') {
    return { gameState, response: { error: 'Hiện không có ai đang xin bài' } };
  }
  if (gameState.favorTarget !== targetPlayerId) {
    return { gameState, response: { error: 'Bạn không phải người cần giao bài' } };
  }

  const target = gameState.players.find(p => p.id === targetPlayerId);
  const requester = gameState.players.find(p => p.id === gameState.favorRequester);
  if (!target || !requester) return { gameState, response: { error: 'Không tìm thấy người chơi' } };

  const cardIndex = target.hand.findIndex(c => c.id === cardId);
  if (cardIndex === -1) return { gameState, response: { error: 'Không tìm thấy lá bài đó trên tay' } };

  const [card] = target.hand.splice(cardIndex, 1);
  requester.hand.push(card);

  gameState.waitingFor = null;
  gameState.favorTarget = null;
  gameState.favorRequester = null;
  addPublicLog(gameState, `🎁 ${target.name} đã đưa 1 lá cho ${requester.name}.`, {
    kind: 'favor',
  });
  addPrivateLog(
    gameState,
    [target.id, requester.id],
    `${target.name} đã đưa ${card.nameVN} cho ${requester.name}.`,
    { kind: 'favor', cards: [cardView(card)] }
  );
  return { gameState, response: { type: 'favor_give', from: targetPlayerId, to: requester.id } };
}

// 🐱 Combo mèo: 2 lá giống → cướp random; 3 lá giống → đòi lá cụ thể; 5 lá khác loại → lấy từ chồng hạ
export function handleCatCombo(gameState, playerId, cardIds, payload = {}) {
  const requester = gameState.players.find(p => p.id === playerId);
  const target = gameState.players.find(p => p.id === payload.targetPlayerId);
  clearWindow(gameState);

  if (!requester || !requester.isAlive) {
    return { gameState, response: { error: 'Người yêu cầu không hợp lệ hoặc đã nổ tung' } };
  }

  if (cardIds.length === 2 || cardIds.length === 3) {
    if (!target || !target.isAlive || target.id === playerId) {
      return { gameState, response: { error: 'Cần chọn đối thủ hợp lệ' } };
    }
    if (target.hand.length === 0) {
      return { gameState, response: { error: 'Đối thủ không còn lá bài nào' } };
    }
    if (takeVuongNiem(gameState, target)) {
      return {
        gameState,
        response: {
          type: 'vuong_niem_blocked',
          playerId,
          targetPlayerId: target.id,
          targetName: target.name,
        },
      };
    }
  }

  if (cardIds.length === 2) {
    setChoice(gameState, {
      playerId,
      kind: 'steal_pick',
      sourceType: 'cat_combo',
      targetPlayerId: target.id,
      targetName: target.name,
      cardCount: target.hand.length,
    });
    addPublicLog(gameState, `🐱 ${requester.name} đang chọn 1 lá úp từ ${target.name}.`, {
    kind: 'steal',
  });
    return { gameState, response: { type: 'choice_request', playerId } };
  }

  if (cardIds.length === 3) {
    const wanted = payload.requestedCardType;
    if (!wanted) return { gameState, response: { error: 'Chưa chọn loại bài muốn đòi' } };
    const idx = target.hand.findIndex(c => c.type === wanted);
    if (idx === -1) {
      addPublicLog(gameState, `🐱 ${requester.name} đòi bài nhưng ${target.name} không có lá đó.`);
      return { gameState, response: { type: 'steal_specific', from: target.id, to: playerId, card: null } };
    }
    const [got] = target.hand.splice(idx, 1);
    requester.hand.push(got);
    addPublicLog(gameState, `🐱 ${requester.name} đã đòi được 1 lá từ ${target.name}.`, {
      kind: 'steal',
    });
    addPrivateLog(
      gameState,
      [requester.id, target.id],
      `${requester.name} đã đòi ${got.nameVN} từ ${target.name}.`,
      { kind: 'steal', cards: [cardView(got)] }
    );
    offerReaction(gameState, target, requester);
    return { gameState, response: { type: 'steal_specific', from: target.id, to: playerId, card: got } };
  }

  if (cardIds.length === 5) {
    let idx = gameState.discardPile.findIndex(c => c.id === payload.discardPickId);
    if (idx === -1) idx = gameState.discardPile.length - 1; // fallback: lá trên cùng
    if (idx === -1) return { gameState, response: { error: 'Chồng bài hạ trống' } };
    const [taken] = gameState.discardPile.splice(idx, 1);
    requester.hand.push(taken);
    addPublicLog(gameState, `🐱 ${requester.name} đã lấy ${taken.nameVN} từ chồng bài hạ (combo 5 lá).`);
    return { gameState, response: { type: 'steal_discard', to: playerId, card: taken } };
  }

  return { gameState, response: { error: 'Kết hợp lá bài không hợp lệ' } };
}

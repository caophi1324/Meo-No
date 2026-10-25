import { EVENTS } from '../../shared/events.js';
import { CONFIG } from './constants.js';
import { CARD_TYPES } from '../../shared/cardTypes.js';
import { sanitizeStateForPlayer } from './stateSanitizer.js';
import { BotAI } from './botAI.js';
import { getTimeoutAction, getTurnTimeoutPlan } from './turnTimer.js';

// ============================================================
// Điều phối hành động chung cho CẢ người thật lẫn Bot (Bước 10)
// Bot đi vào CÙNG gameEngine qua performAction — nhưng chỉ quyết
// định dựa trên view đã lọc (sanitizeStateForPlayer).
// ============================================================

// ---------- Thêm bot vào phòng ----------
export function addBot(room, difficulty = 'normal') {
  if (!room.bots) room.bots = {};
  if (room.players.length >= CONFIG.MAX_PLAYERS) return null;
  const botCount = room.players.filter(p => p.isBot).length + 1;
  const id = `bot_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36).slice(-3)}`;
  const botPlayer = {
    id,
    name: `Mèo Máy ${botCount}`,
    isHost: false,
    isBot: true,
    isAlive: true,
    hand: [],
  };
  room.players.push(botPlayer);
  room.bots[id] = new BotAI(id, difficulty);
  return botPlayer;
}

// ---------- Turn timer ----------
export function clearTurnTimer(room) {
  if (!room) return;
  if (room.turnTimer) clearTimeout(room.turnTimer);
  room.turnTimer = null;
  room.turnEndsAt = null;
  if (room.engine?.gameState) room.engine.gameState.turnEndsAt = null;
}

export function scheduleTurnTimer(io, room) {
  if (!room) return;
  clearTurnTimer(room);
  const gs = room.engine?.gameState;
  const plan = getTurnTimeoutPlan(room);
  if (!gs || !plan) return;

  const limit = room.turnTimeLimit || CONFIG.TURN_TIME_LIMIT;
  const timeoutMs = Math.min(limit * 1000, CONFIG.MAX_TIMEOUT_MS);
  room.turnEndsAt = Date.now() + limit * 1000;
  gs.turnEndsAt = room.turnEndsAt;

  // shortcut: setTimeout chỉ chạy tối đa ~24.8 ngày; timer dài hơn sẽ cần interval.
  room.turnTimer = setTimeout(() => {
    room.turnTimer = null;
    room.turnEndsAt = null;
    gs.turnEndsAt = null;

    // Trạng thái có thể đã đổi trong lúc chờ.
    const still = getTurnTimeoutPlan(room);
    if (!still || still.actorId !== plan.actorId) return;

    const action = getTimeoutAction(gs, plan.actorId);
    if (!action) return;
    performAction(io, room, plan.actorId, action.type, action);
  }, timeoutMs);
}

// ---------- Gửi trạng thái đã lọc cho từng người ----------
export function broadcastStates(io, room) {
  const gs = room.engine?.gameState;
  if (!gs) return;
  scheduleTurnTimer(io, room);
  for (const p of room.players) {
    if (room.bots && room.bots[p.id]) continue; // bot không có socket
    if (p.removed) continue; // người đã rời — không nhận trạng thái nữa
    io.to(p.id).emit(EVENTS.GAME_STATE_UPDATE, sanitizeStateForPlayer(gs, p.id));
  }
}

export function broadcastYourTurn(io, room) {
  const gs = room.engine?.gameState;
  if (!gs || gs.status !== 'playing') return;
  if (gs.waitingFor !== null || gs.pendingAction) return;
  const cur = gs.players[gs.currentPlayerIndex];
  if (!cur) return;
  io.to(cur.id).emit(EVENTS.YOUR_TURN, { playerId: cur.id });
}

// ---------- Phát sự kiện "có bài vừa được chơi" (đã giấu thông tin bí mật) ----------
export function broadcastCardPlayed(io, room, response) {
  if (!response || response.error) return;
  const safe = { ...response };
  delete safe.cards; // Nhìn Tương Lai — không lộ 3 lá
  delete safe.card;  // Cướp/Đòi bài — không lộ danh tính lá

  if (response.type === 'see_the_future' && response.forPlayer) {
    io.to(response.forPlayer).emit(EVENTS.SEE_FUTURE_RESULT, { cards: response.cards });
  }
  io.to(room.roomCode).emit(EVENTS.CARD_PLAYED, safe);
  if (['steal_random', 'steal_specific', 'steal_discard'].includes(response.type)) {
    io.to(room.roomCode).emit(EVENTS.STEAL_RESULT, safe);
  }
}

// ---------- Hiệu ứng phụ + bộ nhớ bot ----------
function emitSideEffects(io, room, response) {
  if (!response || response.error) return;
  if (response.type === 'favor_request' && response.target) {
    io.to(response.target).emit(EVENTS.FAVOR_REQUEST, {
      requester: response.requester,
      target: response.target,
    });
  }
  if (response.type === 'see_the_future' && response.forPlayer) {
    const bot = room.bots?.[response.forPlayer];
    if (bot) {
      bot.memory.topCards = response.cards;
      bot.memory.seenPileCount = room.engine.gameState.drawPile.length;
    }
  }
}

// ---------- Cửa sổ Phủ Nhận ----------
export function openNopeWindow(io, room, response) {
  const gs = room.engine?.gameState;
  if (!gs) return;
  if (room.nopeTimer) {
    clearTimeout(room.nopeTimer);
    room.nopeTimer = null;
  }

  const ownerId = gs.windowOwnerId || response.playerId;
  const eligible = gs.players.filter(
    p => p.isAlive && !p.removed && p.id !== ownerId
  );
  const canAnswerNope = c =>
    !c.disabled &&
    (c.type === CARD_TYPES.NOPE ||
      (c.type === CARD_TYPES.CHONG_XAO_BAI && gs.pendingAction?.type === CARD_TYPES.SHUFFLE));
  const nopeHolders = eligible.filter(p => p.hand?.some(canAnswerNope));

  // Không ai có Nope thì khỏi bắt cả bàn chờ.
  if (nopeHolders.length === 0) {
    resolveNopeWindow(io, room);
    return;
  }

  // Người không có Nope coi như đã pass; chỉ chờ người có Nope.
  const holderIds = new Set(nopeHolders.map(p => p.id));
  gs.nopePassed = eligible.filter(p => !holderIds.has(p.id)).map(p => p.id);

  const nopeSeconds = room.nopeWindowTime || CONFIG.NOPE_WINDOW_TIME;
  const payload = {
    playerId: ownerId,
    action: gs.pendingAction?.type || response.action || null,
    comboSize: gs.pendingAction?.comboSize || 0,
    targetPlayerId: gs.pendingAction?.targetPlayerId || null,
    nopeCount: gs.nopeCount || 0,
    countdown: nopeSeconds,
    total: nopeSeconds,
  };

  for (const p of nopeHolders) {
    if (room.bots?.[p.id]) continue;
    io.to(p.id).emit(EVENTS.NOPE_WINDOW, payload);
  }

  room.nopeTimer = setTimeout(() => {
    room.nopeTimer = null;
    resolveNopeWindow(io, room);
  }, Math.min(nopeSeconds * 1000, CONFIG.MAX_TIMEOUT_MS));
}

export function resolveNopeWindow(io, room) {
  const engine = room.engine;
  const gs = engine?.gameState;
  if (!gs || gs.waitingFor !== 'nope' || !gs.pendingAction) return;
  if (room.nopeTimer) {
    clearTimeout(room.nopeTimer);
    room.nopeTimer = null;
  }

  const prevIndex = gs.currentPlayerIndex;
  const result = engine.resolveNope(gs);
  const response = result.response || {};

  broadcastStates(io, room);
  if (response.type !== 'noop' && !response.error) {
    broadcastCardPlayed(io, room, response);
    emitSideEffects(io, room, response);
  }
  if (response.type === 'alter_future') {
    scheduleAlterFutureTimeout(io, room);
  }
  if (gs.status === 'playing' && gs.waitingFor === null && !gs.pendingAction && gs.currentPlayerIndex !== prevIndex) {
    broadcastYourTurn(io, room);
  }
  scheduleBots(io, room);
}

// Tự chốt thứ tự sau 30 giây nếu người chơi bỏ đi / treo máy
export function scheduleAlterFutureTimeout(io, room) {
  if (room.alterFutureTimer) clearTimeout(room.alterFutureTimer);
  const alterSeconds = room.alterFutureTime || CONFIG.ALTER_FUTURE_TIME;
  room.alterFutureTimer = setTimeout(() => {
    room.alterFutureTimer = null;
    const gs = room.engine?.gameState;
    if (!gs || gs.waitingFor !== 'alter_future' || !gs.alterFuture) return;
    const result = room.engine.handleAlterFutureSubmit(
      gs,
      gs.alterFuture.playerId,
      gs.alterFuture.cardIds
    );
    if (result.response?.error) return;
    broadcastStates(io, room);
    scheduleBots(io, room);
  }, Math.min(alterSeconds * 1000, CONFIG.MAX_TIMEOUT_MS));
}

// ---------- Hành động trung tâm (người thật + bot dùng chung) ----------
export function performAction(io, room, playerId, type, payload = {}) {
  const engine = room.engine;
  const gs = engine?.gameState;
  if (!gs || gs.status !== 'playing') return { error: 'Game chưa bắt đầu' };
  if (!room.players.some(p => p.id === playerId)) return { error: 'Bạn không ở trong phòng này' };

  const prevIndex = gs.currentPlayerIndex;
  let result;

  try {
    switch (type) {
      case 'play_card':
        if (!Array.isArray(payload.cardIds) || payload.cardIds.length === 0) {
          return { error: 'Chưa chọn lá bài nào' };
        }
        result = engine.playCard(gs, playerId, payload.cardIds, payload);
        break;
      case 'draw_card':
        result = engine.drawCard(gs, playerId);
        break;
      case 'defuse_place':
        result = engine.placeExplodingKitten(gs, playerId, payload.position);
        break;
      case 'imploding_place':
        result = engine.placeImplodingKitten(gs, playerId, payload.position);
        break;
      case 'nope_action':
        result = engine.handleNope(gs, playerId);
        break;
      case 'nope_pass':
        result = engine.handleNopePass(gs, playerId);
        break;
      case 'favor_give':
        result = engine.handleFavorGive(gs, playerId, payload.cardId);
        break;
      case 'alter_future_submit':
        if (room.alterFutureTimer) {
          clearTimeout(room.alterFutureTimer);
          room.alterFutureTimer = null;
        }
        result = engine.handleAlterFutureSubmit(gs, playerId, payload.order);
        break;
      case 'choice_response':
        result = engine.handleChoiceResponse(gs, playerId, payload.choiceId, payload.value);
        break;
      default:
        return { error: 'Hành động không hợp lệ' };
    }
  } catch (err) {
    console.error('Lỗi xử lý hành động:', err);
    return { error: 'Lỗi xử lý hành động' };
  }

  const response = result.response || {};
  if (response.error) return { error: response.error };

  broadcastStates(io, room);

  if (response.type === 'nope_window') {
    openNopeWindow(io, room, response);
    scheduleBots(io, room);
    return { ok: true, response };
  }

  if (response.type === 'nope_wait') {
    scheduleBots(io, room);
    return { ok: true, response };
  }

  if (response.type === 'exploded') {
    io.to(room.roomCode).emit(EVENTS.EXPLODED, {
      playerId: response.playerId,
      playerName: response.playerName,
    });
    if (response.gameOver && response.winner) {
      io.to(room.roomCode).emit(EVENTS.GAME_OVER, { winnerName: response.winner.name });
    }
  } else if (response.type === 'exploding_kitten_defuse') {
    // đang chờ chọn vị trí nhét Mèo Nổ — không phát gì thêm
  } else if (response.type === 'imploding_flipped') {
    // đang chờ người bốc tự chọn vị trí đặt lại
  } else if (
    response.type !== 'drew_card' &&
    response.type !== 'defuse_placed' &&
    response.type !== 'imploding_placed' &&
    response.type !== 'alter_future_placed'
  ) {
    broadcastCardPlayed(io, room, response);
    emitSideEffects(io, room, response);
  }

  if (gs.status === 'playing' && gs.waitingFor === null && !gs.pendingAction && gs.currentPlayerIndex !== prevIndex) {
    broadcastYourTurn(io, room);
  }

  scheduleBots(io, room);
  return { ok: true, response };
}

// ============================================================
// Vòng lặp Bot — chờ 1–1.5s để người chơi theo dõi (10.1)
// ============================================================
function isBotId(room, id) {
  return !!(room.bots && room.bots[id]);
}

function isRemovedPlayer(room, id) {
  const p = room.players.find(pl => pl.id === id);
  return !!p && p.removed;
}

function findAutoAction(room) {
  const gs = room.engine?.gameState;
  if (!gs || gs.status !== 'playing' || gs.winner) return null;

  const auto = id => isBotId(room, id) || isRemovedPlayer(room, id);

  if (
    (gs.waitingFor === 'defuse_place' || gs.waitingFor === 'imploding_place') &&
    gs.pendingAction &&
    auto(gs.pendingAction.playerId)
  ) {
    return { playerId: gs.pendingAction.playerId };
  }
  if (gs.waitingFor === 'favor_give' && auto(gs.favorTarget)) {
    return { playerId: gs.favorTarget };
  }
  if (gs.waitingFor === 'alter_future' && gs.alterFuture && auto(gs.alterFuture.playerId)) {
    return { playerId: gs.alterFuture.playerId };
  }
  if (gs.waitingFor === 'choice' && gs.pendingChoice && auto(gs.pendingChoice.playerId)) {
    return { playerId: gs.pendingChoice.playerId };
  }
  if (gs.waitingFor === 'nope') {
    for (const id of Object.keys(room.bots || {})) {
      if (id === gs.windowOwnerId) continue;
      if ((gs.nopePassed || []).includes(id)) continue;
      const p = gs.players.find(pl => pl.id === id);
      if (!p || !p.isAlive) continue;
      if (p.hand.some(c => !c.disabled && c.type === CARD_TYPES.NOPE)) return { playerId: id };
    }
    return null;
  }
  if (!gs.waitingFor) {
    const cur = gs.players[gs.currentPlayerIndex];
    if (cur && auto(cur.id)) return { playerId: cur.id };
  }
  return null;
}

function defaultChoiceValue(choice) {
  if (choice.kind === 'search_top5') return choice.cards?.[0]?.id ?? null;
  if (choice.kind === 'revive_cards') {
    return (choice.cards || []).slice(0, choice.count || 2).map(c => c.id);
  }
  if (choice.kind === 'reaction') return 'pass';
  if (choice.kind === 'steal_pick') {
    return Math.floor(Math.random() * Math.max(1, choice.cardCount || 1));
  }
  if (choice.kind === 'disable_card') return 0;
  return 0;
}

function zombieDecide(view) {
  if (view.waitingFor === 'defuse_place') {
    return { type: 'defuse_place', position: Math.floor(Math.random() * (Math.max(0, view.drawPileCount) + 1)) };
  }
  if (view.waitingFor === 'imploding_place') {
    return { type: 'imploding_place', position: Math.floor(Math.random() * (Math.max(0, view.drawPileCount) + 1)) };
  }
  if (view.waitingFor === 'favor_give') {
    const card = (view.myHand || [])[0];
    return { type: 'favor_give', cardId: card ? card.id : null };
  }
  if (view.waitingFor === 'alter_future') {
    return { type: 'alter_future_submit', order: (view.alterFutureCards || []).map(c => c.id) };
  }
  if (view.waitingFor === 'choice' && view.choice) {
    return { type: 'choice_response', choiceId: view.choice.id, value: defaultChoiceValue(view.choice) };
  }
  if (view.waitingFor === 'nope') return { type: 'nope_pass' };
  return { type: 'draw_card' };
}

export function scheduleBots(io, room) {
  if (room.botTimer) {
    clearTimeout(room.botTimer);
    room.botTimer = null;
  }
  if (!findAutoAction(room)) return;
  const delay = CONFIG.BOT_DELAY_MIN + Math.random() * (CONFIG.BOT_DELAY_MAX - CONFIG.BOT_DELAY_MIN);
  room.botTimer = setTimeout(() => {
    room.botTimer = null;
    runBotAction(io, room);
  }, Math.round(delay));
}

function runBotAction(io, room) {
  const pick = findAutoAction(room);
  const gs = room.engine?.gameState;
  if (!pick || !gs) return;

  const bot = room.bots?.[pick.playerId];
  const view = sanitizeStateForPlayer(gs, pick.playerId);

  let action;
  try {
    if (bot && view.waitingFor !== 'choice') {
      action = bot.decide(view);
    } else {
      action = zombieDecide(view); // người chơi đã mất kết nối quá 60s — đi thay
    }
  } catch (err) {
    console.error('Bot lỗi khi quyết định:', err);
    action = { type: 'draw_card' };
  }

  const res = performAction(io, room, pick.playerId, action.type, action);
  if (res?.error) {
    room.botFailCount = (room.botFailCount || 0) + 1;
    if (room.botFailCount <= 2 && action.type !== 'draw_card') {
      performAction(io, room, pick.playerId, 'draw_card', {});
    } else {
      scheduleBots(io, room);
    }
  } else {
    room.botFailCount = 0;
  }
}

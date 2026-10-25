import test from 'node:test';
import assert from 'node:assert/strict';
import { GameEngine } from './gameEngine.js';
import { CONFIG } from './constants.js';
import { getDeckCounts, createDeck } from './deckBuilder.js';
import { sanitizeStateForPlayer } from './stateSanitizer.js';
import { CUSTOM_PHASE3_EFFECTS } from './customPhase3Effects.js';
import {
  BOOSTABLE_TYPES,
  BEAST_CARDS,
  CARD_TYPES,
  CAT_CARDS,
  WILD_BEAST,
  getPetCombo,
} from '../../shared/cardTypes.js';

let seq = 0;
const card = (type, extra = {}) => ({
  id: `${type}-${++seq}`,
  type,
  nameVN: type,
  emoji: 'x',
  ...extra,
});

function setup(count = 3) {
  const players = Array.from({ length: count }, (_, i) => ({
    id: `p${i + 1}`,
    name: `P${i + 1}`,
    isAlive: true,
  }));
  const engine = new GameEngine(players);
  const gs = engine.initGame(players);
  gs.players.forEach((p) => {
    p.hand = [];
    p.lastAction = null;
    p.isAlive = true;
  });
  gs.drawPile = [];
  gs.discardPile = [];
  gs.currentPlayerIndex = 0;
  gs.turnsRemaining = 1;
  gs.direction = 1;
  gs.lastAttack = null;
  gs.napNhienLieuUsed = false;
  return { engine, gs };
}

function playResolve(engine, gs, playerId, cards, payload = {}) {
  const result = engine.playCard(gs, playerId, cards.map((c) => c.id), payload);
  if (result.response?.type === 'nope_window') return engine.resolveNope(gs);
  return result;
}

test('Tấn Công cộng dồn: đánh ngay nhận 4, đã rút 1 nhận 3', () => {
  const { engine, gs } = setup();
  const a = card(CARD_TYPES.ATTACK);
  gs.players[0].hand = [a];
  playResolve(engine, gs, 'p1', [a]);
  assert.equal(gs.currentPlayerIndex, 1);
  assert.equal(gs.turnsRemaining, 2);

  const b = card(CARD_TYPES.ATTACK);
  gs.players[1].hand = [b];
  playResolve(engine, gs, 'p2', [b]);
  assert.equal(gs.currentPlayerIndex, 2);
  assert.equal(gs.turnsRemaining, 4);

  const { engine: e2, gs: g2 } = setup();
  const a2 = card(CARD_TYPES.ATTACK);
  g2.players[0].hand = [a2];
  playResolve(e2, g2, 'p1', [a2]);
  g2.drawPile = [card(CARD_TYPES.SKIP)];
  e2.drawCard(g2, 'p2');
  assert.equal(g2.turnsRemaining, 1);
  const b2 = card(CARD_TYPES.ATTACK);
  g2.players[1].hand = [b2];
  playResolve(e2, g2, 'p2', [b2]);
  assert.equal(g2.turnsRemaining, 3);
});

test('Tấn Công Chỉ Định luôn 2 lượt, không cộng carried', () => {
  const { engine, gs } = setup();
  gs.turnsRemaining = 5;
  const c = card(CARD_TYPES.TAN_CONG_CHI_DINH);
  gs.players[0].hand = [c];
  playResolve(engine, gs, 'p1', [c], { targetPlayerId: 'p2' });
  assert.equal(gs.currentPlayerIndex, 1);
  assert.equal(gs.turnsRemaining, 2);
});

test('Imploding úp: chờ tự đặt vị trí, không trừ lượt trước khi đặt', () => {
  const { engine, gs } = setup();
  const imploding = card(CARD_TYPES.IMPLODING_KITTEN, { faceUp: false });
  gs.drawPile = [imploding, card(CARD_TYPES.SKIP)];
  const result = engine.drawCard(gs, 'p1');
  assert.equal(result.response.type, 'imploding_flipped');
  assert.equal(gs.waitingFor, 'imploding_place');
  assert.equal(gs.turnsRemaining, 1);
  assert.equal(gs.drawPile.length, 1);

  const placed = engine.placeImplodingKitten(gs, 'p1', 1);
  assert.equal(placed.response.type, 'imploding_placed');
  assert.equal(gs.waitingFor, null);
  assert.equal(gs.drawPile[1].faceUp, true);
  assert.equal(gs.currentPlayerIndex, 1);
});

test('Imploding ngửa: chết, không dùng Gỡ Bom', () => {
  const { engine, gs } = setup();
  const imploding = card(CARD_TYPES.IMPLODING_KITTEN, { faceUp: true });
  gs.players[0].hand = [card(CARD_TYPES.DEFUSE)];
  gs.drawPile = [imploding];
  const result = engine.drawCard(gs, 'p1');
  assert.equal(result.response.type, 'exploded');
  assert.equal(gs.players[0].isAlive, false);
  assert.equal(gs.waitingFor, null);
});

test('Trộm Bài: chọn người, rồi chọn 1 trong N lá úp, không lộ bài', () => {
  const { engine, gs } = setup();
  const steal = card(CARD_TYPES.STEAL_CARD);
  gs.players[0].hand = [steal];
  gs.players[1].hand = [card(CARD_TYPES.SKIP), card(CARD_TYPES.NOPE)];
  playResolve(engine, gs, 'p1', [steal], { targetPlayerId: 'p2' });

  assert.equal(gs.pendingChoice?.kind, 'steal_pick');
  assert.equal(gs.pendingChoice?.cardCount, 2);
  const viewA = sanitizeStateForPlayer(gs, 'p1');
  const viewB = sanitizeStateForPlayer(gs, 'p2');
  assert.equal(viewA.choice.kind, 'steal_pick');
  assert.equal(viewA.choice.cards, null);
  assert.equal(viewB.choice, null);

  const result = engine.handleChoiceResponse(gs, 'p1', gs.pendingChoice.id, 1);
  assert.equal(result.response.type, 'steal_random');
  assert.equal('card' in result.response, false);
  assert.equal(gs.players[1].hand.length, 1);
  assert.equal(gs.players[0].hand.length, 1);
});

test('Combo 2 thú + Siêu Thú Cưng hợp lệ và cướp 1 lá úp', () => {
  const { engine, gs } = setup();
  const a = card(BEAST_CARDS[0]);
  const wild = card(WILD_BEAST);
  gs.players[0].hand = [a, wild];
  gs.players[1].hand = [card(CARD_TYPES.SKIP)];
  playResolve(engine, gs, 'p1', [a, wild], { targetPlayerId: 'p2' });
  assert.equal(gs.pendingChoice?.kind, 'steal_pick');
  engine.handleChoiceResponse(gs, 'p1', gs.pendingChoice.id, 0);
  assert.equal(gs.players[0].hand.length, 1);
});

test('Combo 3 thú đòi đúng loại; combo 5 lấy chồng hạ', () => {
  const c3 = setup();
  const three = [card(BEAST_CARDS[0]), card(BEAST_CARDS[0]), card(WILD_BEAST)];
  c3.gs.players[0].hand = three;
  c3.gs.players[1].hand = [card(CARD_TYPES.SKIP)];
  playResolve(c3.engine, c3.gs, 'p1', three, {
    targetPlayerId: 'p2',
    requestedCardType: CARD_TYPES.SKIP,
  });
  assert.equal(c3.gs.players[0].hand.length, 1);

  const c5 = setup();
  const five = BEAST_CARDS.map((t) => card(t));
  c5.gs.players[0].hand = five;
  c5.gs.discardPile = [card(CARD_TYPES.SKIP, { id: 'discard-pick' })];
  const result = playResolve(c5.engine, c5.gs, 'p1', five, { discardPickId: 'discard-pick' });
  assert.equal(result.response.type, 'steal_discard');
  assert.equal(c5.gs.players[0].hand.length, 1);
});

test('Combo thú: 3 cùng loại và 4 thú + Siêu Thú cho combo 5', () => {
  assert.deepEqual(getPetCombo([BEAST_CARDS[0], BEAST_CARDS[0], BEAST_CARDS[0]]), {
    size: 3,
    family: 'beast',
  });
  assert.deepEqual(getPetCombo([...BEAST_CARDS.slice(0, 4), WILD_BEAST]), {
    size: 5,
    family: 'beast',
  });
  assert.equal(getPetCombo([BEAST_CARDS[0], BEAST_CARDS[1], WILD_BEAST, WILD_BEAST]), null);
});

test('Hai combo thú liên tiếp trong cùng lượt đều thực thi', () => {
  const { engine, gs } = setup();
  const pairA = [card(BEAST_CARDS[0]), card(BEAST_CARDS[0])];
  const pairB = [card(BEAST_CARDS[0]), card(BEAST_CARDS[0])];
  gs.players[0].hand = [...pairA, ...pairB];
  gs.players[1].hand = [card(CARD_TYPES.SKIP), card(CARD_TYPES.SKIP)];
  gs.turnsRemaining = 1;

  playResolve(engine, gs, 'p1', pairA, { targetPlayerId: 'p2' });
  assert.equal(gs.pendingChoice?.kind, 'steal_pick');
  engine.handleChoiceResponse(gs, 'p1', gs.pendingChoice.id, 0);
  assert.equal(gs.players[1].hand.length, 1);

  playResolve(engine, gs, 'p1', pairB, { targetPlayerId: 'p2' });
  assert.equal(gs.pendingChoice?.kind, 'steal_pick');
  engine.handleChoiceResponse(gs, 'p1', gs.pendingChoice.id, 0);
  assert.equal(gs.players[1].hand.length, 0);
  assert.equal(gs.players[0].hand.length, 2);
});

test('Không trộn mèo với thú', () => {
  const { engine, gs } = setup();
  const a = card(CAT_CARDS[0]);
  const b = card(BEAST_CARDS[0]);
  gs.players[0].hand = [a, b];
  gs.players[1].hand = [card(CARD_TYPES.SKIP)];
  const result = engine.playCard(gs, 'p1', [a.id, b.id], { targetPlayerId: 'p2' });
  assert.match(result.response.error, /không hợp lệ/);
  assert.equal(getPetCombo([CAT_CARDS[0], BEAST_CARDS[0]]), null);
});

test('Deck 150 lá, 5 thú × 4 bản', () => {
  const counts = getDeckCounts(2);
  assert.equal(Object.values(counts).reduce((sum, n) => sum + n, 0), 150);
  assert.equal(Object.keys(counts).length, 45);
  for (const type of BEAST_CARDS) assert.equal(counts[type], 4);
  assert.equal(createDeck(2).length, 150);
});

test('Nạp Nhiên Liệu chỉ dùng 1 lần mỗi ván', () => {
  const { engine, gs } = setup();
  const first = card(CARD_TYPES.NAP_NHIEN_LIEU);
  gs.players[0].hand = [first];
  gs.discardPile = [card(CARD_TYPES.SKIP)];
  playResolve(engine, gs, 'p1', [first]);
  assert.equal(gs.napNhienLieuUsed, true);

  const second = card(CARD_TYPES.NAP_NHIEN_LIEU);
  gs.players[1].hand = [second];
  const blocked = engine.playCard(gs, 'p2', [second.id]);
  assert.match(blocked.response.error, /1 lần/);
  assert.equal(gs.players[1].hand.length, 1);
});

test('Tăng Cường: chỉ nhận BOOSTABLE_TYPES, chặn lá nhiều bước', () => {
  assert.ok(BOOSTABLE_TYPES.includes(CARD_TYPES.ATTACK));
  assert.ok(BOOSTABLE_TYPES.includes(CARD_TYPES.SIEU_HUY_BAI));
  assert.ok(!BOOSTABLE_TYPES.includes(CARD_TYPES.TIM_KIEM));
  assert.ok(!BOOSTABLE_TYPES.includes(CARD_TYPES.FAVOR));

  const { engine, gs } = setup();
  const boost = card(CARD_TYPES.TANG_CUONG);
  const tim = card(CARD_TYPES.TIM_KIEM);
  gs.players[0].hand = [boost, tim];
  const blocked = engine.playCard(gs, 'p1', [boost.id, tim.id]);
  assert.match(blocked.response.error, /Tăng Cường/);

  const { engine: e2, gs: g2 } = setup();
  const boost2 = card(CARD_TYPES.TANG_CUONG);
  const attack = card(CARD_TYPES.ATTACK);
  g2.players[0].hand = [boost2, attack];
  playResolve(e2, g2, 'p1', [boost2, attack]);
  assert.equal(g2.turnsRemaining, 4);
});

test('Nhìn Tương Lai chỉ trả bài cho người chơi', () => {
  const { engine, gs } = setup();
  gs.drawPile = [card(CARD_TYPES.SKIP), card(CARD_TYPES.NOPE), card(CARD_TYPES.ATTACK)];
  const see = card(CARD_TYPES.SEE_THE_FUTURE);
  gs.players[0].hand = [see];
  const result = playResolve(engine, gs, 'p1', [see]);
  assert.equal(result.response.type, 'see_the_future');
  assert.equal(result.response.cards.length, 3);
  assert.equal(result.response.forPlayer, 'p1');
  const other = sanitizeStateForPlayer(gs, 'p2');
  assert.equal(other.seeFutureCards, undefined);
});

test('Bỏ Lượt kết thúc lượt và không rút bài', () => {
  const { engine, gs } = setup();
  const skip = card(CARD_TYPES.SKIP);
  gs.players[0].hand = [skip];
  gs.drawPile = [card(CARD_TYPES.SKIP)];
  const beforePile = gs.drawPile.length;
  playResolve(engine, gs, 'p1', [skip]);
  assert.equal(gs.currentPlayerIndex, 1);
  assert.equal(gs.drawPile.length, beforePile);
});

test('Exploding Kitten có Gỡ Bom: chờ đặt và tiêu Gỡ Bom', () => {
  const { engine, gs } = setup();
  const ek = card(CARD_TYPES.EXPLODING_KITTEN);
  const defuse = card(CARD_TYPES.DEFUSE);
  gs.players[0].hand = [defuse];
  gs.drawPile = [ek, card(CARD_TYPES.SKIP)];
  const result = engine.drawCard(gs, 'p1');
  assert.equal(result.response.type, 'exploding_kitten_defuse');
  assert.equal(gs.waitingFor, 'defuse_place');
  engine.placeExplodingKitten(gs, 'p1', 0);
  assert.equal(gs.players[0].isAlive, true);
  assert.equal(gs.players[0].hand.length, 0);
  assert.equal(gs.drawPile[0].type, CARD_TYPES.EXPLODING_KITTEN);
});

test('Nope lẻ hủy, Nope chẵn thi hành', () => {
  const { engine, gs } = setup();
  const skip = card(CARD_TYPES.SKIP);
  const nope = card(CARD_TYPES.NOPE);
  gs.players[0].hand = [skip];
  gs.players[1].hand = [nope];
  const first = engine.playCard(gs, 'p1', [skip.id]);
  assert.equal(first.response.type, 'nope_window');
  engine.handleNope(gs, 'p2');
  const cancelled = engine.resolveNope(gs);
  assert.equal(cancelled.response.type, 'action_cancelled');
  assert.equal(gs.players[0].hand.length, 0);

  const skip2 = card(CARD_TYPES.SKIP);
  gs.players[0].hand = [skip2];
  const second = engine.playCard(gs, 'p1', [skip2.id]);
  assert.equal(second.response.type, 'nope_window');
  const executed = engine.resolveNope(gs);
  assert.equal(executed.response.type, 'skip');
});

test('Vương Niệm chặn 1 lá, mất hiệu lực, lá công kích vẫn mất', () => {
  const { engine, gs } = setup();
  const steal1 = card(CARD_TYPES.STEAL_CARD);
  const steal2 = card(CARD_TYPES.STEAL_CARD);
  const vuong = card(CARD_TYPES.VUONG_NIEM);
  gs.players[0].hand = [steal1, steal2];
  gs.players[1].hand = [vuong, card(CARD_TYPES.SKIP)];

  const blocked = playResolve(engine, gs, 'p1', [steal1], { targetPlayerId: 'p2' });
  assert.equal(blocked.response.type, 'vuong_niem_blocked');
  assert.equal(gs.players[0].hand.length, 1); // steal1 đã mất
  assert.equal(gs.discardPile.some(c => c.id === steal1.id), true);
  assert.equal(gs.players[1].hand.some(c => c.id === vuong.id), false);
  assert.equal(gs.discardPile.some(c => c.id === vuong.id), true);

  const second = playResolve(engine, gs, 'p1', [steal2], { targetPlayerId: 'p2' });
  assert.equal(second.response.type, 'choice_request');
  assert.equal(gs.pendingChoice?.kind, 'steal_pick');
});

test('Sanitizer không lộ bài đối thủ hoặc drawPile', () => {
  const { gs } = setup();
  gs.players[1].hand = [card(CARD_TYPES.SKIP)];
  gs.drawPile = [card(CARD_TYPES.SKIP)];
  const view = sanitizeStateForPlayer(gs, 'p1');
  assert.equal('drawPile' in view, false);
  assert.equal('hand' in view.opponents[0], false);
  assert.equal(view.opponents[0].cardCount, 1);
});

test('Sanitizer công khai Imploding mặt ngửa trên DrawPile', () => {
  const { gs } = setup();
  gs.drawPile = [card(CARD_TYPES.IMPLODING_KITTEN, { faceUp: true })];
  const view = sanitizeStateForPlayer(gs, 'p1');
  assert.equal(view.drawPileTop?.type, CARD_TYPES.IMPLODING_KITTEN);
  assert.equal(view.drawPileTop?.faceUp, true);
});

test('Timer chỉ yêu cầu số dương, không còn trần cứng', () => {
  assert.ok(CONFIG.TURN_TIME_LIMIT >= 1);
  assert.ok(CONFIG.NOPE_WINDOW_TIME >= 1);
  assert.ok(CONFIG.ALTER_FUTURE_TIME >= 1);
  assert.equal(CONFIG.MAX_TIMEOUT_MS, 2_147_483_647);
});

test('Mỗi hiệu ứng Phase 3 chạy được trên state xếp tay', () => {
  for (const [type, handler] of Object.entries(CUSTOM_PHASE3_EFFECTS)) {
    const { gs } = setup();
    gs.players[0].hand = [];
    gs.players[1].hand = [card(CARD_TYPES.SKIP), card(CARD_TYPES.NOPE)];
    gs.players[2].isAlive = false;
    gs.players[2].hand = [card(CARD_TYPES.SKIP)];
    gs.drawPile = [card(CARD_TYPES.SKIP), card(CARD_TYPES.SKIP), card(CARD_TYPES.SKIP)];
    gs.discardPile = [card(CARD_TYPES.SKIP)];
    assert.doesNotThrow(() => handler(gs, 'p1', { targetPlayerId: 'p2' }), type);
  }
});

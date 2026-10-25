import test from 'node:test';
import assert from 'node:assert/strict';
import { GameEngine } from './gameEngine.js';
import { CONFIG } from './constants.js';
import { getDeckCounts, createDeck } from './deckBuilder.js';
import { sanitizeStateForPlayer } from './stateSanitizer.js';
import { CUSTOM_PHASE3_EFFECTS } from './customPhase3Effects.js';
import { getTimeoutAction } from './turnTimer.js';
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

test('Chia Sẻ: người bị chọn tự chọn nửa bài, boost chọn hết', () => {
  const { engine, gs } = setup();
  const chia = card(CARD_TYPES.CHIA_SE);
  gs.players[0].hand = [chia];
  const victimHand = Array.from({ length: 6 }, () => card(CARD_TYPES.SKIP));
  gs.players[1].hand = [...victimHand];

  const result = playResolve(engine, gs, 'p1', [chia], { targetPlayerId: 'p2' });
  assert.equal(result.response.type, 'choice_request');
  assert.equal(result.response.playerId, 'p2');
  assert.equal(gs.pendingChoice.kind, 'discard_half_pick');
  assert.equal(gs.pendingChoice.playerId, 'p2');
  assert.equal(gs.pendingChoice.count, 3);
  assert.equal(gs.pendingChoice.cards.length, 6);
  assert.equal(sanitizeStateForPlayer(gs, 'p1').choice, null);
  assert.equal(sanitizeStateForPlayer(gs, 'p2').choice.kind, 'discard_half_pick');

  const picked = victimHand.slice(0, 3).map(c => c.id);
  const pickedResult = engine.handleChoiceResponse(gs, 'p2', gs.pendingChoice.id, picked);
  assert.equal(pickedResult.response.type, 'choice_resolved');
  assert.equal(gs.players[1].hand.length, 3);
  assert.equal(gs.discardPile.length, 4); // lá Chia Sẻ + 3 lá bị hủy

  const boosted = setup();
  const boost = card(CARD_TYPES.TANG_CUONG);
  const chia2 = card(CARD_TYPES.CHIA_SE);
  boosted.gs.players[0].hand = [boost, chia2];
  boosted.gs.players[1].hand = Array.from({ length: 6 }, () => card(CARD_TYPES.SKIP));
  playResolve(boosted.engine, boosted.gs, 'p1', [boost, chia2], { targetPlayerId: 'p2' });
  assert.equal(boosted.gs.pendingChoice.kind, 'discard_half_pick');
  assert.equal(boosted.gs.pendingChoice.count, 6);
});

test('Hủy Bài: người đánh chọn 2/4 lá úp, index sai bị từ chối', () => {
  const { engine, gs } = setup();
  const huy = card(CARD_TYPES.HUY_BAI);
  gs.players[0].hand = [huy];
  gs.players[1].hand = Array.from({ length: 4 }, () => card(CARD_TYPES.SKIP));

  const result = playResolve(engine, gs, 'p1', [huy], { targetPlayerId: 'p2' });
  assert.equal(result.response.type, 'choice_request');
  assert.equal(gs.pendingChoice.kind, 'destroy_pick');
  assert.equal(gs.pendingChoice.playerId, 'p1');
  assert.equal(gs.pendingChoice.cardCount, 4);
  assert.equal(gs.pendingChoice.count, 2);

  const ownerView = sanitizeStateForPlayer(gs, 'p1');
  assert.equal(ownerView.choice.kind, 'destroy_pick');
  assert.equal(ownerView.choice.cards, null);
  assert.equal(ownerView.choice.cardCount, 4);
  assert.equal(sanitizeStateForPlayer(gs, 'p2').choice, null);

  assert.match(engine.handleChoiceResponse(gs, 'p1', gs.pendingChoice.id, [0, 0]).response.error, /đủ 2 lá/);
  assert.match(engine.handleChoiceResponse(gs, 'p1', gs.pendingChoice.id, [0, 9]).response.error, /hợp lệ/);
  assert.equal(gs.players[1].hand.length, 4);

  const picked = engine.handleChoiceResponse(gs, 'p1', gs.pendingChoice.id, [0, 2]);
  assert.equal(picked.response.type, 'choice_resolved');
  assert.equal(gs.players[1].hand.length, 2);
  assert.equal(gs.discardPile.length, 3); // lá Hủy Bài + 2 lá bị hủy

  const boosted = setup();
  const boost = card(CARD_TYPES.TANG_CUONG);
  const huy2 = card(CARD_TYPES.HUY_BAI);
  boosted.gs.players[0].hand = [boost, huy2];
  boosted.gs.players[1].hand = Array.from({ length: 6 }, () => card(CARD_TYPES.SKIP));
  playResolve(boosted.engine, boosted.gs, 'p1', [boost, huy2], { targetPlayerId: 'p2' });
  assert.equal(boosted.gs.pendingChoice.count, 4);
  boosted.engine.handleChoiceResponse(boosted.gs, 'p1', boosted.gs.pendingChoice.id, [0, 1, 2, 3]);
  assert.equal(boosted.gs.players[1].hand.length, 2);
});

test('Móc Rác phản đòn: chọn lá, rồi tự chọn 2 lá úp từ người cướp', () => {
  const { engine, gs } = setup();
  const steal = card(CARD_TYPES.STEAL_CARD);
  const moc = card(CARD_TYPES.MOC_RAC);
  gs.players[0].hand = [steal, card(CARD_TYPES.SKIP), card(CARD_TYPES.SKIP)];
  gs.players[1].hand = [moc, card(CARD_TYPES.SKIP)];

  playResolve(engine, gs, 'p1', [steal], { targetPlayerId: 'p2' });
  engine.handleChoiceResponse(gs, 'p1', gs.pendingChoice.id, 1);
  assert.equal(gs.pendingChoice.kind, 'reaction');
  assert.equal(gs.pendingChoice.playerId, 'p2');

  const offered = engine.handleChoiceResponse(gs, 'p2', gs.pendingChoice.id, moc.id);
  assert.equal(offered.response.type, 'choice_request');
  assert.equal(gs.pendingChoice.kind, 'reaction_pick');
  assert.equal(gs.pendingChoice.playerId, 'p2');
  assert.equal(gs.pendingChoice.targetPlayerId, 'p1');
  assert.equal(gs.pendingChoice.count, 2);
  assert.equal(gs.pendingChoice.cardCount, 3);
  assert.equal(sanitizeStateForPlayer(gs, 'p2').choice.cards, null);

  const stolen = engine.handleChoiceResponse(gs, 'p2', gs.pendingChoice.id, [0, 1]);
  assert.equal(stolen.response.type, 'reaction_steal');
  assert.equal(gs.players[1].hand.length, 2);
  assert.equal(gs.players[0].hand.length, 1);

  const direct = setup();
  const cardDirect = card(CARD_TYPES.MOC_RAC);
  direct.gs.players[0].hand = [cardDirect];
  const blocked = direct.engine.playCard(direct.gs, 'p1', [cardDirect.id]);
  assert.match(blocked.response.error, /vừa bị cướp/);

  const guarded = setup();
  const steal2 = card(CARD_TYPES.STEAL_CARD);
  const moc2 = card(CARD_TYPES.MOC_RAC);
  guarded.gs.players[0].hand = [
    steal2,
    card(CARD_TYPES.SKIP),
    card(CARD_TYPES.SKIP),
    card(CARD_TYPES.VUONG_NIEM),
  ];
  guarded.gs.players[1].hand = [moc2, card(CARD_TYPES.SKIP)];
  playResolve(guarded.engine, guarded.gs, 'p1', [steal2], { targetPlayerId: 'p2' });
  guarded.engine.handleChoiceResponse(guarded.gs, 'p1', guarded.gs.pendingChoice.id, 1);
  const stopped = guarded.engine.handleChoiceResponse(guarded.gs, 'p2', guarded.gs.pendingChoice.id, moc2.id);
  assert.equal(stopped.response.type, 'reaction_steal');
  assert.equal(stopped.response.stolen, 0);
  assert.equal(stopped.response.blocked, true);
  assert.equal(guarded.gs.pendingChoice, null);
});

test('Sao Chép không random mục tiêu: mở picker khi target cũ không hợp lệ', () => {
  const { engine, gs } = setup(3);
  const sao = card(CARD_TYPES.SAO_CHEP);
  gs.players[0].hand = [sao];
  gs.players[1].hand = [card(CARD_TYPES.SKIP)];
  gs.players[2].hand = [card(CARD_TYPES.SKIP)];
  gs.players[2].lastAction = { type: CARD_TYPES.FAVOR, payload: {} };

  const result = playResolve(engine, gs, 'p1', [sao]);
  assert.equal(result.response.type, 'choice_request');
  assert.equal(gs.pendingChoice.kind, 'copy_target');
  assert.equal(gs.pendingChoice.playerId, 'p1');
  assert.deepEqual(gs.pendingChoice.cards.map(c => c.id).sort(), ['p2', 'p3']);

  engine.handleChoiceResponse(gs, 'p1', gs.pendingChoice.id, 'p2');
  assert.equal(gs.waitingFor, 'favor_give');
  assert.equal(gs.favorTarget, 'p2');
  assert.equal(gs.favorRequester, 'p1');
});

test('Giờ Giải Lao: người đánh tự chọn 3 lá úp để xem', () => {
  const { engine, gs } = setup();
  const gio = card(CARD_TYPES.GIO_GIAI_LAO);
  gs.players[0].hand = [gio];
  const targetHand = Array.from({ length: 5 }, () => card(CARD_TYPES.SKIP));
  gs.players[1].hand = [...targetHand];

  const result = playResolve(engine, gs, 'p1', [gio], { targetPlayerId: 'p2' });
  assert.equal(result.response.type, 'choice_request');
  assert.equal(gs.pendingChoice.kind, 'reveal_pick');
  assert.equal(gs.pendingChoice.playerId, 'p1');
  assert.equal(gs.pendingChoice.cardCount, 5);
  assert.equal(gs.pendingChoice.count, 3);
  assert.equal(sanitizeStateForPlayer(gs, 'p1').choice.cards, null);
  assert.equal(sanitizeStateForPlayer(gs, 'p2').choice, null);

  const seen = engine.handleChoiceResponse(gs, 'p1', gs.pendingChoice.id, [0, 2, 4]);
  assert.equal(seen.response.type, 'see_the_future');
  assert.equal(seen.response.forPlayer, 'p1');
  assert.equal(seen.response.cards.length, 3);
  assert.equal(gs.players[1].hand.length, 5);
  assert.equal(gs.players[1].hand[0].id, targetHand[0].id);

  const boosted = setup();
  const boost = card(CARD_TYPES.TANG_CUONG);
  const gio2 = card(CARD_TYPES.GIO_GIAI_LAO);
  boosted.gs.players[0].hand = [boost, gio2];
  boosted.gs.players[1].hand = Array.from({ length: 4 }, () => card(CARD_TYPES.SKIP));
  playResolve(boosted.engine, boosted.gs, 'p1', [boost, gio2], { targetPlayerId: 'p2' });
  assert.equal(boosted.gs.pendingChoice.kind, 'reveal_pick');
  assert.equal(boosted.gs.pendingChoice.count, 4);
});

test('Tiệc Tùng: từng người tự chọn 1 lá úp theo vòng', () => {
  const { engine, gs } = setup(3);
  const party = card(CARD_TYPES.TIEC_TUNG);
  const p1Card = card(CARD_TYPES.SKIP);
  const p2Card = card(CARD_TYPES.SKIP);
  const p3Card = card(CARD_TYPES.SKIP);
  gs.players[0].hand = [party, p1Card];
  gs.players[1].hand = [p2Card];
  gs.players[2].hand = [p3Card];

  const result = playResolve(engine, gs, 'p1', [party]);
  assert.equal(result.response.type, 'choice_request');
  assert.equal(gs.pendingChoice.kind, 'party_pick');
  assert.equal(gs.pendingChoice.playerId, 'p1');
  assert.equal(sanitizeStateForPlayer(gs, 'p2').choice, null);

  engine.handleChoiceResponse(gs, 'p1', gs.pendingChoice.id, p1Card.id);
  assert.equal(gs.drawPile[0].id, p1Card.id);
  assert.equal(gs.pendingChoice.kind, 'party_pick');
  assert.equal(gs.pendingChoice.playerId, 'p2');

  engine.handleChoiceResponse(gs, 'p2', gs.pendingChoice.id, p2Card.id);
  assert.equal(gs.drawPile[0].id, p2Card.id);
  assert.equal(gs.pendingChoice.playerId, 'p3');

  const done = engine.handleChoiceResponse(gs, 'p3', gs.pendingChoice.id, p3Card.id);
  assert.equal(done.response.type, 'choice_resolved');
  assert.equal(gs.pendingParty, null);
  assert.equal(gs.waitingFor, null);
  assert.equal(gs.drawPile.length, 3);
  assert.equal(gs.drawPile[0].id, p3Card.id);
  assert.equal(gs.players[0].hand.length, 0);
  assert.equal(gs.players[1].hand.length, 0);
  assert.equal(gs.players[2].hand.length, 0);
});

test('Mỗi ván có đúng 1 Nạp Nhiên Liệu', () => {
  for (let n = 2; n <= 5; n++) {
    const counts = getDeckCounts(n);
    assert.equal(counts[CARD_TYPES.NAP_NHIEN_LIEU], 1);
    assert.equal(Object.values(counts).reduce((sum, x) => sum + x, 0), 150);
  }
});

test('Bộ Liên Minh: thú cùng loại cùng ảnh, lá khác unique', () => {
  const deck = createDeck(4);
  assert.equal(deck.length, 150);

  const expectedBeasts = {
    [CARD_TYPES.CAO_LUA]: 'Ahri',
    [CARD_TYPES.HO_VAN]: 'Nasus',
    [CARD_TYPES.CHIM_UNG]: 'Teemo',
    [CARD_TYPES.CA_CHEP]: 'Yuumi',
    [CARD_TYPES.HUOU_SAO]: 'Lillia',
  };
  for (const [type, name] of Object.entries(expectedBeasts)) {
    const copies = deck.filter(c => c.type === type);
    assert.equal(copies.length, 4);
    assert.equal(new Set(copies.map(c => c.lolImage)).size, 1);
    assert.equal(copies[0].lolName, name);
    assert.ok(copies[0].lolSkinName);
  }

  const others = deck.filter(c => !BEAST_CARDS.includes(c.type));
  assert.equal(new Set(others.map(c => c.lolImage)).size, others.length);
  assert.ok(deck.every(c => c.lolImage?.startsWith('/cards/lol/') && c.lolName && c.lolSkinName));
});

test('Choice mới có giá trị timeout/bot hợp lệ', () => {
  const { gs } = setup();
  gs.waitingFor = 'choice';

  gs.pendingChoice = { id: 'c1', playerId: 'p1', kind: 'destroy_pick', cardCount: 5, count: 2, targetPlayerId: 'p2' };
  let action = getTimeoutAction(gs, 'p1');
  assert.equal(action.type, 'choice_response');
  assert.equal(action.value.length, 2);
  assert.equal(new Set(action.value).size, 2);
  assert.ok(action.value.every(i => i >= 0 && i < 5));

  gs.pendingChoice = { id: 'c2', playerId: 'p1', kind: 'reaction_pick', cardCount: 4, count: 2 };
  action = getTimeoutAction(gs, 'p1');
  assert.equal(action.value.length, 2);
  assert.ok(action.value.every(i => i >= 0 && i < 4));

  const hand = Array.from({ length: 6 }, () => card(CARD_TYPES.SKIP));
  gs.pendingChoice = { id: 'c3', playerId: 'p1', kind: 'discard_half_pick', count: 3, cards: hand };
  action = getTimeoutAction(gs, 'p1');
  assert.equal(action.value.length, 3);
  assert.equal(new Set(action.value).size, 3);
  assert.ok(action.value.every(id => hand.some(c => c.id === id)));

  gs.pendingChoice = { id: 'c5', playerId: 'p1', kind: 'party_pick', count: 1, cards: [{ id: 'a' }, { id: 'b' }] };
  action = getTimeoutAction(gs, 'p1');
  assert.ok(['a', 'b'].includes(action.value));

  gs.pendingChoice = { id: 'c6', playerId: 'p1', kind: 'reveal_pick', cardCount: 4, count: 3 };
  action = getTimeoutAction(gs, 'p1');
  assert.equal(action.value.length, 3);
  assert.equal(new Set(action.value).size, 3);
  assert.ok(action.value.every(i => i >= 0 && i < 4));

  gs.pendingChoice = { id: 'c7', playerId: 'p1', kind: 'copy_target', cards: [{ id: 'p2' }, { id: 'p3' }] };
  action = getTimeoutAction(gs, 'p1');
  assert.ok(['p2', 'p3'].includes(action.value));
});

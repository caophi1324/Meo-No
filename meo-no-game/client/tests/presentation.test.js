import test from 'node:test';
import assert from 'node:assert/strict';
import store from '../src/store/gameStore.js';
import { quadraticPoint } from '../src/utils/animationGeometry.js';

const card = (id, type = 'attack') => ({ id, type });
const state = (hand = [], discard = [], publicLog = []) => ({ roomCode: 'test', status: 'playing', currentPlayerId: 'me', myHand: hand, discardPile: discard, publicLog });
function reset(hand = []) { store.getState().resetGame(); store.setState({ playerId: 'me', gameState: state(hand) }); }

test('FIFO retains every effect and rejects stale completion', () => {
  reset();
  for (let i = 0; i < 12; i++) store.getState().setCardEffect({ type: 'attack', playerId: `p${i}` });
  const first = store.getState().cardEffect.effectId;
  store.getState().completeEffect('stale');
  assert.equal(store.getState().cardEffect.effectId, first);
  for (let i = 0; i < 12; i++) {
    const s = store.getState(); assert.equal(s.cardEffect.playerId, `p${i}`);
    s.completeEffect(s.cardEffect.effectId);
  }
  assert.equal(store.getState().cardEffect, null);
  assert.equal(store.getState().effectQueue.length, 0);
});

test('optimistic play + state update + socket echo has exactly one flight', () => {
  const c = card('a'); reset([c]);
  store.getState().preparePlay([c], { a: { left: 20, top: 300, width: 80, height: 112 } });
  const id = store.getState().cardEffect.effectId;
  store.getState().setGameState(state([], [c], [{ id: 'l1', kind: 'play' }]));
  store.getState().setCardEffect({ type: 'attack', playerId: 'me' });
  assert.equal(store.getState().cardEffect.effectId, id);
  assert.equal(store.getState().effectQueue.length, 0);
  assert.equal(store.getState().playedPresentations.length, 1);
  assert.equal(store.getState().cardEffect.showEffect, true);
});

test('late Nope-window result displays effect without another flight or sound', () => {
  const c = card('a'); reset([c]);
  store.getState().preparePlay([c], {});
  store.getState().setGameState(state([], [c], [{ id: 'l1', kind: 'play' }]));
  const id = store.getState().cardEffect.effectId;
  store.getState().markEffectLanded(id); store.getState().completeEffect(id);
  store.getState().setCardEffect({ type: 'attack', playerId: 'me' });
  assert.equal(store.getState().cardEffect.flight, false);
  assert.equal(store.getState().cardEffect.silent, true);
});

test('two legitimate cards of same type are never collapsed', () => {
  const a = card('a'), b = card('b'); reset([a,b]);
  store.getState().preparePlay([a], {});
  store.getState().setGameState(state([b], [a], [{ id: 'l1', kind: 'play' }]));
  store.getState().setCardEffect({ type: 'attack', playerId: 'me' });
  store.getState().preparePlay([b], {});
  store.getState().setGameState(state([], [a,b], [{ id: 'l1', kind: 'play' }, { id: 'l2', kind: 'play' }]));
  store.getState().setCardEffect({ type: 'attack', playerId: 'me' });
  assert.equal(store.getState().effectQueue.length, 1);
  assert.equal(store.getState().effectQueue[0].cards[0].id, 'b');
  assert.equal(store.getState().playedPresentations.filter(p => p.resolved).length, 2);
});

test('combo keeps all physical cards and confirmed transfer', () => {
  const cards = [card('a', 'taco_cat'), card('b', 'taco_cat')]; reset(cards);
  store.getState().preparePlay(cards, {});
  store.getState().setGameState(state([], cards, [{ id: 'l1', kind: 'play' }]));
  store.getState().setCardEffect({ type: 'steal_random', from: 'bot', to: 'me' });
  assert.deepEqual(store.getState().cardEffect.cards.map(c => c.id), ['a','b']);
  assert.equal(store.getState().cardEffect.transfer, true);
});

test('opponent plays use only publicly discarded cards and ignore duplicate state', () => {
  reset(); store.setState({ gameState: { ...state(), currentPlayerId: 'bot' } });
  const next = { ...state([], [card('public')], [{ id: 'l1', kind: 'play' }]), currentPlayerId: 'me' };
  store.getState().setGameState(next); store.getState().setGameState(next);
  assert.equal(store.getState().cardEffect.playerId, 'bot');
  assert.equal(store.getState().effectQueue.length, 0);
});

test('discarding destroyed cards does not masquerade as a play', () => {
  reset(); store.getState().setGameState(state([], [card('destroyed')], [{ id: 'l1', kind: 'destroy' }]));
  assert.equal(store.getState().cardEffect, null);
});

test('server classifies played Attack/Future logs by effect, still animate remote play', () => {
  for (const [type, kind, name] of [['attack', 'attack', 'Tấn Công'], ['see_the_future', 'reveal', 'Nhìn Tương Lai']]) {
    reset(); store.setState({ gameState: { ...state(), currentPlayerId: 'bot' } });
    store.getState().setGameState(state([], [card('remote', type)], [{ id: 'actual', kind, text: `🎴 Mèo Máy đã chơi ${name}` }]));
    assert.equal(store.getState().cardEffect.playerId, 'bot');
    assert.equal(store.getState().cardEffect.cards[0].type, type);
  }
});

test('rejected optimistic play is removed without cancelling accepted queued effects', () => {
  reset([card('a')]); store.getState().preparePlay([card('a')], {});
  store.getState().setCardEffect({ type: 'skip', playerId: 'bot' });
  store.getState().cancelPendingPlay();
  assert.equal(store.getState().cardEffect.type, 'skip');
  assert.equal(store.getState().playedPresentations.length, 0);
});

test('reset removes queue and stale callbacks cannot affect new round', () => {
  reset(); store.getState().setCardEffect({ type: 'attack' }); const id = store.getState().cardEffect.effectId;
  reset(); store.getState().setCardEffect({ type: 'skip' }); store.getState().completeEffect(id);
  assert.equal(store.getState().cardEffect.type, 'skip');
});

test('rejoin snapshot does not replay old plays', () => {
  store.getState().resetGame(); store.getState().setGameState(state([], [card('old')], [{ id: 'old', kind: 'play' }]));
  assert.equal(store.getState().cardEffect, null);
});

test('curve endpoints exact, midpoint raised', () => {
  assert.equal(quadraticPoint(300, 100, 200, 0), 300);
  assert.equal(quadraticPoint(300, 100, 200, 1), 200);
  assert.equal(quadraticPoint(300, 100, 200, .5), 175);
});

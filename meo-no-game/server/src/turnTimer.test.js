import test from 'node:test';
import assert from 'node:assert/strict';
import { clearTurnTimer, openNopeWindow, scheduleTurnTimer } from './gameActions.js';
import { getTimeoutAction, getTurnTimeoutPlan } from './turnTimer.js';

function makeRoom(overrides = {}) {
  const gs = {
    status: 'playing',
    winner: null,
    waitingFor: null,
    pendingAction: null,
    currentPlayerIndex: 0,
    favorTarget: null,
    drawPile: [],
    discardPile: [],
    gameLog: [],
    players: [
      { id: 'human', isBot: false, removed: false, hand: [] },
      { id: 'bot', isBot: true, removed: false, hand: [] },
    ],
    ...overrides.gameState,
  };
  return {
    engine: { gameState: gs },
    bots: { bot: {} },
    ...overrides.room,
  };
}

test('human turn gets a timer plan', () => {
  assert.deepEqual(getTurnTimeoutPlan(makeRoom()), {
    actorId: 'human',
    waitingFor: 'turn',
  });
});

test('bot and removed players are skipped', () => {
  const botRoom = makeRoom();
  botRoom.engine.gameState.currentPlayerIndex = 1;
  assert.equal(getTurnTimeoutPlan(botRoom), null);

  const removedRoom = makeRoom();
  removedRoom.engine.gameState.players[0].removed = true;
  assert.equal(getTurnTimeoutPlan(removedRoom), null);
});

test('defuse and favor states target the responsible human', () => {
  const defuse = makeRoom({
    gameState: { waitingFor: 'defuse_place', pendingAction: { playerId: 'human' } },
  });
  assert.equal(getTurnTimeoutPlan(defuse)?.actorId, 'human');

  const favor = makeRoom({
    gameState: { waitingFor: 'favor_give', favorTarget: 'human' },
  });
  assert.equal(getTurnTimeoutPlan(favor)?.actorId, 'human');
});

test('states with their own timer are skipped', () => {
  assert.equal(getTurnTimeoutPlan(makeRoom({ gameState: { waitingFor: 'nope' } })), null);
  assert.equal(getTurnTimeoutPlan(makeRoom({ gameState: { waitingFor: 'alter_future' } })), null);
  assert.equal(getTurnTimeoutPlan(makeRoom({ gameState: { status: 'finished' } })), null);
});

test('timeout actions are safe auto-actions', () => {
  assert.deepEqual(getTimeoutAction({ waitingFor: null }, 'human'), { type: 'draw_card' });

  const defuseAction = getTimeoutAction({ waitingFor: 'defuse_place', drawPile: [1, 2, 3] }, 'human');
  assert.equal(defuseAction.type, 'defuse_place');
  assert.ok(defuseAction.position >= 0 && defuseAction.position <= 3);

  const favorAction = getTimeoutAction(
    {
      waitingFor: 'favor_give',
      players: [{ id: 'human', hand: [{ id: 'card-1' }] }],
    },
    'human'
  );
  assert.deepEqual(favorAction, { type: 'favor_give', cardId: 'card-1' });
});

test('scheduling uses the room limit and clearing cancels the timer', () => {
  const room = makeRoom();
  room.turnTimeLimit = 30;
  const before = Date.now();
  scheduleTurnTimer({}, room);

  assert.ok(room.turnTimer);
  assert.ok(room.turnEndsAt >= before + 30_000);
  assert.ok(room.turnEndsAt <= Date.now() + 30_000);
  assert.equal(room.engine.gameState.turnEndsAt, room.turnEndsAt);

  clearTurnTimer(room);
  assert.equal(room.turnTimer, null);
  assert.equal(room.engine.gameState.turnEndsAt, null);
});

test('nope window uses the room nope timer', () => {
  const room = makeRoom({
    gameState: {
      waitingFor: 'nope',
      windowOwnerId: 'human',
      pendingAction: { type: 'attack' },
      players: [
        { id: 'human', isBot: false, isAlive: true, removed: false, hand: [] },
        { id: 'holder', isBot: false, isAlive: true, removed: false, hand: [{ type: 'nope' }] },
      ],
    },
  });
  room.nopeWindowTime = 8;
  const emitted = [];
  const io = {
    to: () => ({
      emit: (event, payload) => emitted.push({ event, payload }),
    }),
  };

  openNopeWindow(io, room, { playerId: 'human' });
  assert.equal(emitted[0].payload.countdown, 8);
  assert.equal(emitted[0].payload.total, 8);

  clearTimeout(room.nopeTimer);
  room.nopeTimer = null;
});

test('nope window resolves immediately when nobody has nope', () => {
  const players = [
    { id: 'human', isBot: false, isAlive: true, removed: false, hand: [] },
    { id: 'other', isBot: false, isAlive: true, removed: false, hand: [] },
  ];
  const room = makeRoom({
    gameState: {
      waitingFor: 'nope',
      windowOwnerId: 'human',
      pendingAction: { type: 'attack' },
      players,
    },
  });
  room.players = players;
  room.roomCode = 'TEST';
  room.engine.resolveNope = () => {
    room.engine.gameState.waitingFor = null;
    room.engine.gameState.pendingAction = null;
    return { response: { type: 'card_played', playerId: 'human', cardIds: [] } };
  };

  const io = { to: () => ({ emit: () => {} }) };
  openNopeWindow(io, room, { playerId: 'human' });

  assert.ok(!room.nopeTimer);
  assert.equal(room.engine.gameState.waitingFor, null);
  clearTurnTimer(room);
});


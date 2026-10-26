// Deterministic socket smoke test. Run from client/: node _smoke.mjs
// Spawns its own server on port 4100, plays one create → join → start → draw flow.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { io } from 'socket.io-client';
import { EVENTS as E } from '../shared/events.js';
import { themedImage, cardBackFor } from '../shared/decks.js';
import { createDeck } from '../server/src/deckBuilder.js';

const PORT = 4100;
const URL = `http://127.0.0.1:${PORT}`;
const PUBLIC = path.resolve('public');
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Validate both themes have art for every card used by the real 150-card deck.
for (const image of new Set(createDeck(2).map((card) => card.image))) {
  for (const theme of ['default', 'anime']) {
    const file = path.join(PUBLIC, themedImage(image, theme).replace(/^\//, ''));
    if (!fs.existsSync(file)) throw new Error(`missing ${theme} art: ${themedImage(image, theme)}`);
  }
}

console.log('PASS: both themes have art for the 150-card deck');

for (const card of createDeck(2)) {
  const file = path.join(PUBLIC, card.lolImage.replace(/^\//, ''));
  if (!fs.existsSync(file)) throw new Error(`missing lol art: ${card.lolImage}`);
}
console.log('PASS: LoL theme has art for the 150-card deck');

// Card back riêng cho cả 3 theme chơi được.
for (const theme of ['default', 'anime', 'lol']) {
  const file = path.join(PUBLIC, cardBackFor(theme).replace(/^\//, ''));
  if (!fs.existsSync(file)) throw new Error(`missing ${theme} card back: ${cardBackFor(theme)}`);
}
console.log('PASS: 3 theme card backs exist');

let server;
let host;
let guest;
let finished = false;

function cleanup(code) {
  if (finished) return;
  finished = true;
  try { host?.disconnect(); } catch {}
  try { guest?.disconnect(); } catch {}
  try { server?.kill(); } catch {}
  setTimeout(() => process.exit(code), 300);
}

function fail(message) {
  console.error(`FAIL: ${message}`);
  cleanup(1);
}

const watchdog = setTimeout(() => fail('timeout after 8s'), 8000);
watchdog.unref?.();

async function waitFor(fn, timeout = 4000, label = 'condition') {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    try {
      if (fn()) return true;
    } catch {}
    await sleep(40);
  }
  throw new Error(`waited ${label}`);
}

async function waitServer() {
  for (let i = 0; i < 60; i++) {
    try {
      const res = await fetch(`${URL}/socket.io/?EIO=4&transport=polling`);
      if (res.ok) return;
    } catch {}
    await sleep(100);
  }
  throw new Error('server did not start on 4100');
}

function connect() {
  const socket = io(URL, { transports: ['websocket'], forceNew: true, reconnection: false });
  const client = { socket, state: null, lobby: null, roomCode: null, errors: [] };
  socket.on(E.GAME_STATE_UPDATE, (state) => { client.state = state; });
  socket.on(E.LOBBY_UPDATE, (payload) => { client.lobby = payload; });
  socket.on(E.ROOM_CREATED, ({ roomCode }) => { client.roomCode = roomCode; });
  socket.on(E.ERROR, (payload) => client.errors.push(payload?.message || 'error'));
  return client;
}

async function main() {
  server = spawn(process.execPath, [path.resolve('../server/src/index.js')], {
    env: { ...process.env, PORT: String(PORT) },
    stdio: ['ignore', 'ignore', 'pipe'],
  });
  server.stderr.on('data', (data) => {
    const text = data.toString();
    if (text.trim()) console.error('server:', text.trim());
  });

  await waitServer();

  host = connect();
  guest = connect();
  await waitFor(() => host.socket.connected && guest.socket.connected, 3000, 'connections');

  host.socket.emit(E.CREATE_ROOM, { playerName: 'Smoke Host' });
  await waitFor(() => host.roomCode, 3000, 'room_created');

  guest.socket.emit(E.JOIN_ROOM, { roomCode: host.roomCode, playerName: 'Smoke Guest' });
  await waitFor(() => (host.lobby?.players || []).length === 2, 3000, '2 lobby players');

  host.socket.emit(E.START_GAME, { roomCode: host.roomCode });
  await waitFor(() => host.state?.status === 'playing', 3000, 'host playing');
  await waitFor(() => guest.state?.status === 'playing', 3000, 'guest playing');

  if (host.state.drawPile !== undefined) throw new Error('host state leaks drawPile');
  if (guest.state.drawPile !== undefined) throw new Error('guest state leaks drawPile');
  if (host.state.opponents?.some((p) => p.hand !== undefined)) throw new Error('opponent hand leaked');
  if (host.state.myHand?.length !== 8) throw new Error(`unexpected host hand size: ${host.state.myHand?.length}`);
  if (!(host.state.opponents?.[0]?.cardCount > 0)) throw new Error('opponent card count missing');
  if (host.errors.length || guest.errors.length) throw new Error(`server errors: ${[...host.errors, ...guest.errors].join(' | ')}`);

  const before = host.state.drawPileCount;
  host.socket.emit(E.DRAW_CARD, { roomCode: host.roomCode });
  await waitFor(() => host.state.drawPileCount < before, 3000, 'drawPileCount decrease');
  if (host.state.drawPile !== undefined) throw new Error('draw state leaks drawPile');

  // Private log: chỉ người rút thấy tên lá, public chỉ generic.
  await waitFor(
    () => (host.state.myPrivateLog || []).some((entry) => /rút được/.test(entry.text)),
    3000,
    'host private draw log'
  );
  const hostPrivate = host.state.myPrivateLog.find((entry) => /rút được/.test(entry.text));
  const secretName = hostPrivate.cards?.[0]?.nameVN;
  if (!secretName) throw new Error('private draw log has no card detail');
  const guestState = JSON.stringify(guest.state);
  if (guestState.includes(hostPrivate.id)) throw new Error('guest receives host private log entry');
  const guestPrivate = (guest.state.myPrivateLog || []).map((entry) => entry.text).join('\n');
  if (guestPrivate.includes(secretName)) throw new Error('guest receives host private card name');
  const publicText = (host.state.gameLog || []).join('\n');
  if (!/đã rút 1 lá/.test(publicText)) throw new Error('missing public draw log');
  if (publicText.includes(secretName)) throw new Error('public log leaks drawn card name');

  console.log(`PASS: room ${host.roomCode}, 2 players, status playing, drawPileCount ${before} -> ${host.state.drawPileCount}`);
  clearTimeout(watchdog);
  cleanup(0);
}

main().catch((error) => fail(error.message));

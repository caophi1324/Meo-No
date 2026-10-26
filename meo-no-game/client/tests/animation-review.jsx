// Dev-only, deterministic presentation fixture. Not an application entry or server change.
import React from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import GamePage from '../src/pages/GamePage';
import store from '../src/store/gameStore';
import { socket } from '../src/socket';
import { soundEffects } from '../src/utils/soundEffects';
import { CARD_DATA } from '../src/data/cardData';
import { EVENTS } from '../../shared/events';
import '../src/index.css';

socket.disconnect();
const cards = ['attack', 'skip', 'see_the_future', 'reverse', 'taco_cat', 'taco_cat', 'defuse'].map((type, i) => ({ ...CARD_DATA[type], id: `review-${i}`, type }));
const initial = () => ({ roomCode: 'REVIEW', status: 'playing', myHand: cards, opponents: [{ id: 'bot', name: 'Mèo Máy', cardCount: 8, isAlive: true, isBot: true }], currentPlayerId: 'reviewer', isMyTurn: true, isAlive: true, isHost: true, drawPileCount: 120, discardPile: [], waitingFor: null, publicLog: [], gameLog: [], myPrivateLog: [], turnDirection: 1 });
store.setState({ gameState: initial(), playerId: 'reviewer', playerName: 'Người thử', roomCode: 'REVIEW', connectionLost: false });
let seq = 0;
const dispatch = (event, payload) => socket.listeners(event).forEach(fn => fn(payload));
const emit = socket.emit.bind(socket);
socket.emit = (event, payload) => {
  if (event !== EVENTS.PLAY_CARD && event !== EVENTS.DRAW_CARD) return socket;
  const state = store.getState().gameState;
  if (event === EVENTS.DRAW_CARD) {
    dispatch(EVENTS.GAME_STATE_UPDATE, { ...state, drawPileCount: state.drawPileCount - 1 });
    return socket;
  }
  const played = state.myHand.filter(c => payload.cardIds.includes(c.id));
  if (!played.length) return socket;
  const id = ++seq;
  setTimeout(() => {
    dispatch(EVENTS.GAME_STATE_UPDATE, { ...state, myHand: state.myHand.filter(c => !payload.cardIds.includes(c.id)), discardPile: [...state.discardPile, ...played], publicLog: [...state.publicLog, { id: `log-${id}`, kind: 'play', text: `🎴 Người thử đã chơi ${played.map(c => c.nameVN).join(' + ')}` }] });
    dispatch(EVENTS.CARD_PLAYED, { type: played.length > 1 ? 'steal_random' : played[0].type, playerId: 'reviewer', cardIds: payload.cardIds, ...(played.length > 1 ? { from: 'bot', to: 'reviewer' } : {}) });
  }, 80);
  return socket;
};

window.animationReview = {
  store, soundEffects, dispatch, cards,
  reset() { store.getState().resetGame(); store.setState({ gameState: initial(), playerId: 'reviewer', playerName: 'Người thử', roomCode: 'REVIEW', connectionLost: false }); },
  playCards(ids) {
    const hand = store.getState().gameState.myHand;
    const origins = Object.fromEntries(ids.map(id => {
      const r = document.querySelector(`[data-hand] [data-card-id="${id}"]`)?.getBoundingClientRect();
      return [id, r ? { left: r.left, top: r.top, width: r.width, height: r.height } : null];
    }));
    store.getState().preparePlay?.(hand.filter(c => ids.includes(c.id)), origins);
    socket.emit(EVENTS.PLAY_CARD, { cardIds: ids, roomCode: 'REVIEW' });
  },
  async sequence(gap = 2300) {
    for (const card of cards.slice(0, 3)) {
      store.setState({ selectedCards: [card.id] });
      await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
      document.querySelector('.game-action-bar button').click();
      await new Promise(r => setTimeout(r, gap));
    }
  },
  async frames(duration = 8000) {
    const samples = []; const start = performance.now(); let last = start;
    await new Promise(resolve => { const tick = now => { samples.push(now - last); last = now; if (now - start < duration) requestAnimationFrame(tick); else resolve(); }; requestAnimationFrame(tick); });
    samples.shift(); const sorted = [...samples].sort((a,b) => a-b);
    return { frames: samples.length, meanFps: 1000 / (samples.reduce((a,b) => a+b, 0) / samples.length), p95FrameMs: sorted[Math.floor(sorted.length * .95)], over20ms: samples.filter(n => n > 20).length, userAgent: navigator.userAgent };
  },
};
createRoot(document.getElementById('root')).render(<React.StrictMode><MemoryRouter initialEntries={['/game/REVIEW']}><Routes><Route path="/game/:roomCode" element={<GamePage/>}/></Routes></MemoryRouter></React.StrictMode>);

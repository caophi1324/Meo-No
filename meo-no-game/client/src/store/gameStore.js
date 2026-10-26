import { create } from 'zustand';
import { appendPresentation, nextPresentationId, playPresentation, receiveEffect, finishPresentation, observePlayedCards } from './presentation.js';
import { captureCardOrigins } from '../utils/animationGeometry.js';

let toastId = 0;
let chatId = 0;

const useGameStore = create((set, get) => ({
  socket: null,
  connectionLost: false,
  setSocket: (socket) => set({ socket }),

  playerName: '',
  setPlayerName: (name) => set({ playerName: name }),
  playerId: null,
  setPlayerId: (id) => set({ playerId: id }),
  deckTheme: 'default',

  roomCode: null,
  setRoomCode: (code) => set({ roomCode: code }),
  lobbyPlayers: [],
  setLobbyPlayers: (players) => set({ lobbyPlayers: players }),
  lobbyStatus: 'lobby',
  lobbyTimers: { turnTimeLimit: 60, nopeWindowTime: 5, alterFutureTime: 30 },

  gameState: null,
  setGameState: (state) => {
    // giữ lại các lá đang chọn nếu vẫn còn trên tay
    const selected = get().selectedCards.filter(id =>
      (state?.myHand || []).some(c => c.id === id)
    );
    const current = get();
    const origins = captureCardOrigins((current.gameState?.myHand || []).map(c => c.id));
    const freshRound = current.gameState && (current.gameState.roomCode !== state.roomCode || (current.gameState.status !== 'playing' && state.status === 'playing'));
    const presentation = freshRound || current.presentationNeedsBaseline ? { cardEffect: null, effectQueue: [], playedPresentations: [], seeFuturePending: null } : observePlayedCards(current, state, origins);
    set({ gameState: state, selectedCards: selected, presentationNeedsBaseline: false, ...presentation });
  },

  selectedCards: [],
  toggleSelectCard: (card) => {
    const id = typeof card === 'string' ? card : card?.id;
    if (!id) return;
    const current = get().selectedCards;
    set({
      selectedCards: current.includes(id)
        ? current.filter(x => x !== id)
        : [...current, id],
    });
  },
  clearSelectedCards: () => set({ selectedCards: [] }),

  // ---- trạng thái modal ----
  showDefuseModal: false,
  showStealModal: false,
  showNopePopup: false,
  nopeInfo: null,
  nopeCountdown: 0,
  nopeTotal: 5,
  showGameOver: false,
  winnerName: null,
  showSeeTheFuture: false,
  seeTheFutureCards: [],
  seeFuturePending: null,
  setSeeTheFuture: (show, cards = []) => set({ showSeeTheFuture: show, seeTheFutureCards: cards, seeFuturePending: null }),
  showFavorGive: false,
  favorGiveInfo: null,
  cardEffect: null,
  effectQueue: [],
  playedPresentations: [],
  presentationNeedsBaseline: false,
  enqueueDraw: (fromRect) => set(s => appendPresentation(s, { effectId: nextPresentationId(), type: 'drew_card', motionKind: 'draw', flight: true, showEffect: false, phase: 'flight', fromRect, playerId: s.playerId, theme: s.deckTheme })),
  preparePlay: (cards, origins) => set(s => {
    if (!cards.length || s.playedPresentations.some(p => !p.accepted && p.cardIds.some(id => cards.some(c => c.id === id)))) return {};
    return playPresentation(s, cards, s.playerId, origins);
  }),
  setCardEffect: (effect) => set(s => effect ? receiveEffect(s, effect) : finishPresentation(s, s.cardEffect?.effectId)),
  completeEffect: (id) => set(s => finishPresentation(s, id)),
  markEffectLanded: (id) => set(s => ({
    cardEffect: s.cardEffect?.effectId === id ? { ...s.cardEffect, phase: 'effect' } : s.cardEffect,
    playedPresentations: s.playedPresentations.map(p => p.actionId === id ? { ...p, landed: true } : p),
  })),
  clearEffects: () => set({ cardEffect: null, effectQueue: [], playedPresentations: [] }),
  cancelPendingPlay: () => set(s => {
    const ids = new Set(s.playedPresentations.filter(p => !p.accepted).map(p => p.actionId));
    const queue = s.effectQueue.filter(e => !ids.has(e.actionId));
    const cancelActive = ids.has(s.cardEffect?.actionId);
    return { playedPresentations: s.playedPresentations.filter(p => !ids.has(p.actionId)), cardEffect: cancelActive ? queue[0] || null : s.cardEffect, effectQueue: cancelActive ? queue.slice(1) : queue };
  }),

  // ---- chat ----
  chatMessages: [],
  addChatMessage: (msg) =>
    set((s) => ({
      chatMessages: [...s.chatMessages.slice(-99), { id: ++chatId, ...msg }],
    })),

  // ---- toast ----
  toasts: [],
  pushToast: (message) => {
    const id = ++toastId;
    set((s) => ({ toasts: [...s.toasts, { id, message }] }));
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter(t => t.id !== id) }));
    }, 4000);
  },
  removeToast: (id) => set((s) => ({ toasts: s.toasts.filter(t => t.id !== id) })),

  resetGame: () =>
    set({
      gameState: null,
      selectedCards: [],
      showDefuseModal: false,
      showStealModal: false,
      showNopePopup: false,
      nopeInfo: null,
      nopeCountdown: 0,
      nopeTotal: 5,
      showGameOver: false,
      winnerName: null,
      showSeeTheFuture: false,
      seeTheFutureCards: [],
      seeFuturePending: null,
      showFavorGive: false,
      favorGiveInfo: null,
      cardEffect: null,
      effectQueue: [],
      playedPresentations: [],
      presentationNeedsBaseline: false,
      chatMessages: [],
      lobbyPlayers: [],
      lobbyStatus: 'lobby',
      lobbyTimers: { turnTimeLimit: 60, nopeWindowTime: 5, alterFutureTime: 30 },
      deckTheme: 'default',
      toasts: [],
    }),
}));

export default useGameStore;

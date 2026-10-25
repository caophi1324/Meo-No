import { create } from 'zustand';

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
    set({ gameState: state, selectedCards: selected });
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
  setSeeTheFuture: (show, cards = []) => set({ showSeeTheFuture: show, seeTheFutureCards: cards }),
  showFavorGive: false,
  favorGiveInfo: null,
  cardEffect: null,
  setCardEffect: (effect) => set({ cardEffect: effect }),

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
      showFavorGive: false,
      favorGiveInfo: null,
      cardEffect: null,
      chatMessages: [],
      lobbyPlayers: [],
      lobbyStatus: 'lobby',
      lobbyTimers: { turnTimeLimit: 60, nopeWindowTime: 5, alterFutureTime: 30 },
      deckTheme: 'default',
      toasts: [],
    }),
}));

export default useGameStore;

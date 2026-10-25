import { io } from 'socket.io-client';
import { EVENTS } from '../../shared/events.js';
import { CARD_TYPES } from '../../shared/cardTypes.js';
import useGameStore from './store/gameStore.js';

// ============================================================
// SOCKET SINGLETON — tạo kết nối MỘT LẦN DUY NHẤT cho cả app,
// đăng ký toàn bộ listener 1 lần. Các trang chỉ emit hành động.
// (Sửa lỗi B3: mỗi trang tự io() → tạo kết nối mới, mất trạng thái)
// ============================================================

export const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:4000';
export const socket = io(SOCKET_URL);

let nopeTicker = null;
let effectSeq = 0;

function persistIdentity() {
  const s = useGameStore.getState();
  try {
    sessionStorage.setItem(
      'meono_identity',
      JSON.stringify({ roomCode: s.roomCode, playerId: s.playerId, playerName: s.playerName })
    );
  } catch {
    /* bỏ qua */
  }
}

function readIdentity() {
  try {
    return JSON.parse(sessionStorage.getItem('meono_identity') || 'null');
  } catch {
    return null;
  }
}

export function clearIdentity() {
  try {
    sessionStorage.removeItem('meono_identity');
  } catch {
    /* bỏ qua */
  }
}

function nameOf(playerId, state) {
  if (!playerId) return 'Ai đó';
  if (playerId === state.playerId) return state.playerName || 'Bạn';
  const opp = state.gameState?.opponents?.find(o => o.id === playerId);
  if (opp) return opp.name;
  const lp = state.lobbyPlayers?.find(o => o.id === playerId);
  if (lp) return lp.name;
  return 'Ai đó';
}

// ==================== KẾT NỐI ====================
socket.on('connect', () => {
  const store = useGameStore.getState();
  const wasLost = store.connectionLost;
  const saved = readIdentity(); // đọc danh tính LƯU TRƯỚC khi ghi đè

  useGameStore.setState({ connectionLost: false });
  if (wasLost) store.pushToast('✅ Đã kết nối lại!');
  store.setPlayerId(socket.id);
  if (saved?.roomCode && !store.roomCode) store.setRoomCode(saved.roomCode);
  if (saved?.playerName && !store.playerName) store.setPlayerName(saved.playerName);
  persistIdentity();

  // Khôi phục danh tính khi F5 / rớt mạng ngay trong phòng
  const onGameRoute = /^\/(game|lobby)\//.test(window.location.pathname);
  if (onGameRoute && saved && saved.roomCode && saved.playerId && saved.playerId !== socket.id) {
    socket.emit(EVENTS.REJOIN, { roomCode: saved.roomCode, playerId: saved.playerId });
  }
});

socket.on('disconnect', () => {
  useGameStore.setState({ connectionLost: true });
});

socket.on('connect_error', () => {
  useGameStore.setState({ connectionLost: true });
});

// ==================== PHÒNG ====================
socket.on(EVENTS.ROOM_CREATED, ({ roomCode }) => {
  useGameStore.getState().setRoomCode(roomCode);
  persistIdentity();
});

socket.on(EVENTS.LOBBY_UPDATE, (payload = {}) => {
  const store = useGameStore.getState();
  store.setLobbyPlayers(payload.players || []);
  useGameStore.setState({
    lobbyStatus: payload.status || 'lobby',
    deckTheme: payload.deckTheme || 'default',
    lobbyTimers: {
      turnTimeLimit: payload.turnTimeLimit || 60,
      nopeWindowTime: payload.nopeWindowTime || 5,
      alterFutureTime: payload.alterFutureTime || 30,
    },
  });
  persistIdentity();
});

// ==================== GAME STATE ====================
socket.on(EVENTS.GAME_STATE_UPDATE, (state) => {
  const store = useGameStore.getState();
  // Bỏ qua trạng thái từ phòng khác (tránh lẫn state khi nằm 2 phòng)
  if (state.roomCode && store.roomCode && state.roomCode !== store.roomCode) return;
  store.setGameState(state);
  if (state.deckTheme) useGameStore.setState({ deckTheme: state.deckTheme });
  persistIdentity();
  if (state.waitingFor !== 'nope') {
    useGameStore.setState({ showNopePopup: false });
  }
  if (state.waitingFor !== 'favor_give') {
    useGameStore.setState({ showFavorGive: false, favorGiveInfo: null });
  }
  if (state.status === 'playing') {
    useGameStore.setState({ showGameOver: false, winnerName: null });
  }
});

socket.on(EVENTS.YOUR_TURN, () => {
  useGameStore.getState().pushToast('🎯 Đến lượt bạn chơi!');
});

// ==================== HIỆU ỨNG LÁ BÀI ====================
socket.on(EVENTS.CARD_PLAYED, (payload = {}) => {
  useGameStore.getState().setCardEffect({
    ...payload,
    effectId: `${Date.now()}-${++effectSeq}`,
  });
});

// ==================== CỬA SỔ PHỦ NHẬN ====================
socket.on(EVENTS.NOPE_WINDOW, (payload = {}) => {
  const store = useGameStore.getState();
  const myId = store.playerId;
  if (store.gameState?.isAlive === false) {
    useGameStore.setState({ showNopePopup: false });
    return;
  }
  const eligible = payload.playerId !== myId; // người đang chơi bài không tự nope mình

  useGameStore.setState({
    showNopePopup: eligible,
    nopeCountdown: payload.countdown ?? 5,
    nopeTotal: payload.total ?? payload.countdown ?? 5,
    nopeInfo: {
      ownerId: payload.playerId,
      ownerName: nameOf(payload.playerId, store),
      action: payload.action,
      comboSize: payload.comboSize || 0,
      nopeCount: payload.nopeCount || 0,
    },
  });

  if (nopeTicker) clearInterval(nopeTicker);
  nopeTicker = setInterval(() => {
    const cur = useGameStore.getState().nopeCountdown;
    if (cur <= 1) {
      clearInterval(nopeTicker);
      nopeTicker = null;
      useGameStore.setState({ showNopePopup: false, nopeCountdown: 0 });
    } else {
      useGameStore.setState({ nopeCountdown: cur - 1 });
    }
  }, 1000);
});

// ==================== NHÌN TƯƠNG LAI ====================
socket.on(EVENTS.SEE_FUTURE_RESULT, ({ cards }) => {
  useGameStore.setState({ showSeeTheFuture: true, seeTheFutureCards: cards || [] });
});

// ==================== XIN BÀI ====================
socket.on(EVENTS.FAVOR_REQUEST, (payload = {}) => {
  const store = useGameStore.getState();
  if (payload.target === store.playerId) {
    useGameStore.setState({
      showFavorGive: true,
      favorGiveInfo: {
        requesterId: payload.requester,
        requesterName: nameOf(payload.requester, store),
      },
    });
  }
});

// ==================== NỔ / KẾT THÚC ====================
socket.on(EVENTS.EXPLODED, ({ playerName }) => {
  useGameStore.getState().pushToast(`💥 ${playerName} đã nổ tung!`);
});

socket.on(EVENTS.GAME_OVER, ({ winnerName }) => {
  useGameStore.setState({ showGameOver: true, winnerName });
});

// ==================== CHAT ====================
socket.on(EVENTS.CHAT_BROADCAST, (msg) => {
  useGameStore.getState().addChatMessage(msg);
});

// ==================== KẾT NỐI / LỖI ====================
socket.on(EVENTS.PLAYER_DISCONNECTED, ({ playerName }) => {
  useGameStore.getState().pushToast(`⚠️ ${playerName} mất kết nối — chờ 60 giây...`);
});

socket.on(EVENTS.PLAYER_RECONNECTED, ({ playerName }) => {
  useGameStore.getState().pushToast(`✅ ${playerName} đã kết nối lại!`);
});

socket.on(EVENTS.ERROR, ({ message }) => {
  useGameStore.getState().pushToast(message || 'Có lỗi xảy ra!');
});

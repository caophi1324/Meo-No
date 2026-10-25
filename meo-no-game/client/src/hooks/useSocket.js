import { useMemo } from 'react';
import { socket } from '../socket.js';
import { EVENTS } from '../../../shared/events.js';

// Chỉ còn là các hàm emit — KHÔNG tạo kết nối mới ở đây.
// Kết nối duy nhất nằm ở src/socket.js (singleton).
export function useSocket() {
  return useMemo(
    () => ({
      createRoom: (playerName, options = {}) => socket.emit(EVENTS.CREATE_ROOM, { playerName, ...options }),
      joinRoom: (roomCode, playerName) => socket.emit(EVENTS.JOIN_ROOM, { roomCode, playerName }),
      startGame: (roomCode) => socket.emit(EVENTS.START_GAME, { roomCode }),
      restartGame: (roomCode) => socket.emit(EVENTS.RESTART_GAME, { roomCode }),
      leaveRoom: (roomCode) => socket.emit(EVENTS.LEAVE_ROOM, { roomCode }),
      addBot: (roomCode, difficulty = 'normal') => socket.emit(EVENTS.ADD_BOT, { roomCode, difficulty }),
      setTimers: (roomCode, timers) => socket.emit(EVENTS.SET_TIMERS, { roomCode, ...timers }),
      setDeckTheme: (roomCode, deckTheme) => socket.emit(EVENTS.SET_DECK_THEME, { roomCode, deckTheme }),
      playCard: (roomCode, cardIds, extra = {}) => socket.emit(EVENTS.PLAY_CARD, { roomCode, cardIds, ...extra }),
      drawCard: (roomCode) => socket.emit(EVENTS.DRAW_CARD, { roomCode }),
      defusePlace: (roomCode, position) => socket.emit(EVENTS.DEFUSE_PLACE, { roomCode, position }),
      implodingPlace: (roomCode, position) => socket.emit(EVENTS.IMPLODING_PLACE, { roomCode, position }),
      nopeAction: (roomCode) => socket.emit(EVENTS.NOPE_ACTION, { roomCode }),
      nopePass: (roomCode) => socket.emit(EVENTS.NOPE_PASS, { roomCode }),
      favorGive: (roomCode, cardId) => socket.emit(EVENTS.FAVOR_GIVE, { roomCode, cardId }),
      alterFutureSubmit: (roomCode, order) =>
        socket.emit(EVENTS.ALTER_FUTURE_SUBMIT, { roomCode, order }),
      choiceRespond: (roomCode, choiceId, value) =>
        socket.emit(EVENTS.CHOICE_RESPONSE, { roomCode, choiceId, value }),
      sendChat: (roomCode, message) => socket.emit(EVENTS.CHAT_MESSAGE, { roomCode, message }),
    }),
    []
  );
}

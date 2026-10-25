import { EVENTS } from '../../shared/events.js';
import { DECK_THEME_IDS, DEFAULT_DECK_THEME } from '../../shared/decks.js';
import { CONFIG } from './constants.js';
import { sanitizeStateForPlayer, sanitizeLobbyPlayers } from './stateSanitizer.js';
import {
  addBot,
  broadcastStates,
  clearTurnTimer,
  openNopeWindow,
  performAction,
  scheduleAlterFutureTimeout,
  scheduleBots,
  scheduleTurnTimer,
} from './gameActions.js';

export function registerSocketHandlers(io, roomManager, GameEngine) {
  const broadcastLobby = (room) => {
    io.to(room.roomCode).emit(EVENTS.LOBBY_UPDATE, {
      players: sanitizeLobbyPlayers(room.players),
      status: room.status,
      mode: room.mode || 'normal',
      turnTimeLimit: room.turnTimeLimit || CONFIG.TURN_TIME_LIMIT,
      nopeWindowTime: room.nopeWindowTime || CONFIG.NOPE_WINDOW_TIME,
      alterFutureTime: room.alterFutureTime || CONFIG.ALTER_FUTURE_TIME,
      deckTheme: room.deckTheme || DEFAULT_DECK_THEME,
    });
  };

  const findRoomByCode = (roomCode) =>
    roomManager.getRoom(String(roomCode || '').trim().toUpperCase());

  const clearRoomTimers = (room) => {
    if (room.nopeTimer) clearTimeout(room.nopeTimer);
    if (room.botTimer) clearTimeout(room.botTimer);
    if (room.alterFutureTimer) clearTimeout(room.alterFutureTimer);
    clearTurnTimer(room);
    room.nopeTimer = null;
    room.botTimer = null;
    room.alterFutureTimer = null;
  };

  const promoteNextHost = (room, leavingPlayerId) => {
    const leaving = room.players.find(p => p.id === leavingPlayerId);
    if (!leaving?.isHost) return;
    leaving.isHost = false;
    const next = room.players.find(p => p.id !== leavingPlayerId && !p.isBot && !p.removed);
    if (next) next.isHost = true;
  };

  // Rời các phòng chờ cũ (tránh 1 socket nằm 2 phòng).
  // Phòng ĐANG ĐẤU: đánh dấu "removed" để bot/zombie đi thay — ván tự kết thúc.
  const leaveOtherLobbies = (socket, exceptRoomCode) => {
    for (const [code, room] of roomManager.rooms) {
      if (code === exceptRoomCode) continue;
      const player = room.players.find(p => p.id === socket.id && !p.isBot);
      if (!player) continue;
      socket.leave(code);
      if (room.status === 'playing') {
        promoteNextHost(room, socket.id);
        player.removed = true;
        broadcastStates(io, room);
        scheduleBots(io, room);
      } else {
        roomManager.removePlayer(code, socket.id);
        const r = roomManager.getRoom(code);
        if (r) broadcastLobby(r);
      }
    }
  };

  const startGameInternal = (room) => {
    room.players.forEach(p => {
      p.isAlive = true;
      p.removed = false;
    });
    const engine = new GameEngine(room.players);
    engine.initGame(room.players);
    engine.gameState.roomCode = room.roomCode;
    engine.gameState.timers = {
      turnTimeLimit: room.turnTimeLimit || CONFIG.TURN_TIME_LIMIT,
      nopeWindowTime: room.nopeWindowTime || CONFIG.NOPE_WINDOW_TIME,
      alterFutureTime: room.alterFutureTime || CONFIG.ALTER_FUTURE_TIME,
    };
    engine.gameState.deckTheme = room.deckTheme || DEFAULT_DECK_THEME;
    room.engine = engine;
    room.gameState = engine.gameState;
    room.status = 'playing';
    if (room.nopeTimer) {
      clearTimeout(room.nopeTimer);
      room.nopeTimer = null;
    }
    if (room.alterFutureTimer) {
      clearTimeout(room.alterFutureTimer);
      room.alterFutureTimer = null;
    }
    if (room.bots) {
      for (const id of Object.keys(room.bots)) room.bots[id].resetMemory();
    }

    engine.addLog('🎮 Ván đấu bắt đầu! Chúc may mắn 🍀');
    engine.addLog(`🎯 ${engine.gameState.players[0].name} đi trước.`);
    scheduleTurnTimer(io, room);

    for (const p of room.players) {
      if (room.bots && room.bots[p.id]) continue;
      io.to(p.id).emit(EVENTS.GAME_STATE_UPDATE, sanitizeStateForPlayer(engine.gameState, p.id));
    }
    const first = engine.gameState.players[engine.gameState.currentPlayerIndex];
    if (first && !(room.bots && room.bots[first.id])) {
      io.to(first.id).emit(EVENTS.YOUR_TURN, { playerId: first.id });
    }
    scheduleBots(io, room);
  };

  io.on('connection', (socket) => {
    console.log(`Người chơi kết nối: ${socket.id}`);

    // ==================== PHÒNG ====================
    socket.on(EVENTS.CREATE_ROOM, (payload = {}) => {
      const playerName = String(payload.playerName || '').trim().slice(0, 20);
      if (!playerName) return socket.emit(EVENTS.ERROR, { message: 'Vui lòng nhập tên của bạn!' });

      const roomCode = roomManager.createRoom(socket.id, playerName);
      socket.join(roomCode);
      const room = roomManager.getRoom(roomCode);

      if (payload.mode === 'bot') {
        room.mode = 'bot';
        const count = Math.min(4, Math.max(1, parseInt(payload.botCount, 10) || 1));
        const difficulty = ['easy', 'normal', 'hard'].includes(payload.botDifficulty)
          ? payload.botDifficulty
          : 'normal';
        room.botDifficulty = difficulty;
        for (let i = 0; i < count; i++) addBot(room, difficulty);
      }

      socket.emit(EVENTS.ROOM_CREATED, { roomCode });
      broadcastLobby(room);
    });

    socket.on(EVENTS.JOIN_ROOM, (payload = {}) => {
      const roomCode = String(payload.roomCode || '').trim().toUpperCase();
      const playerName = String(payload.playerName || '').trim().slice(0, 20);
      if (!playerName) return socket.emit(EVENTS.ERROR, { message: 'Vui lòng nhập tên của bạn!' });

      leaveOtherLobbies(socket, roomCode);
      const room = roomManager.joinRoom(roomCode, socket.id, playerName);
      if (!room) {
        socket.emit(EVENTS.ERROR, {
          message: 'Không thể tham gia phòng. Mã phòng không đúng, phòng đầy hoặc game đã bắt đầu.',
        });
        return;
      }
      socket.join(roomCode);
      broadcastLobby(room);
    });

    // Khôi phục danh tính sau khi F5 / mất mạng
    socket.on(EVENTS.REJOIN, (payload = {}) => {
      const roomCode = String(payload.roomCode || '').trim().toUpperCase();
      const oldPlayerId = payload.playerId;
      const room = findRoomByCode(roomCode);
      if (!room || !oldPlayerId) return;
      const player = room.players.find(p => p.id === oldPlayerId);
      if (!player) return;

      roomManager.clearReconnectTimer(roomCode, oldPlayerId);
      player.id = socket.id;
      player.removed = false;
      socket.join(roomCode);

      if (room.status === 'playing' && room.engine) {
        socket.emit(
          EVENTS.GAME_STATE_UPDATE,
          sanitizeStateForPlayer(room.engine.gameState, socket.id)
        );
        io.to(roomCode).emit(EVENTS.PLAYER_RECONNECTED, { playerId: socket.id, playerName: player.name });
      }
      broadcastLobby(room);
    });

    socket.on(EVENTS.ADD_BOT, (payload = {}) => {
      const room = findRoomByCode(payload.roomCode);
      if (!room) return socket.emit(EVENTS.ERROR, { message: 'Phòng không tồn tại' });
      if (room.status !== 'lobby') return socket.emit(EVENTS.ERROR, { message: 'Chỉ thêm Bot khi ở phòng chờ' });
      const requester = room.players.find(p => p.id === socket.id);
      if (!requester?.isHost) return socket.emit(EVENTS.ERROR, { message: 'Chỉ chủ phòng mới thêm được Bot' });
      if (room.players.length >= CONFIG.MAX_PLAYERS) {
        return socket.emit(EVENTS.ERROR, { message: 'Phòng đã đủ 5 người chơi' });
      }
      const difficulty = ['easy', 'normal', 'hard'].includes(payload.difficulty) ? payload.difficulty : 'normal';
      addBot(room, difficulty);
      broadcastLobby(room);
    });

    socket.on(EVENTS.SET_TIMERS, (payload = {}) => {
      const room = findRoomByCode(payload.roomCode);
      if (!room) return socket.emit(EVENTS.ERROR, { message: 'Phòng không tồn tại' });
      const requester = room.players.find(p => p.id === socket.id);
      if (!requester?.isHost) {
        return socket.emit(EVENTS.ERROR, { message: 'Chỉ chủ phòng mới đổi thời gian được' });
      }

      const next = {
        turnTimeLimit: Math.round(Number(payload.turnTimeLimit)),
        nopeWindowTime: Math.round(Number(payload.nopeWindowTime)),
        alterFutureTime: Math.round(Number(payload.alterFutureTime)),
      };
      if (
        !Number.isFinite(next.turnTimeLimit) ||
        next.turnTimeLimit < 1 ||
        !Number.isFinite(next.nopeWindowTime) ||
        next.nopeWindowTime < 1 ||
        !Number.isFinite(next.alterFutureTime) ||
        next.alterFutureTime < 1
      ) {
        return socket.emit(EVENTS.ERROR, {
          message: 'Thời gian phải là số giây từ 1 trở lên',
        });
      }

      room.turnTimeLimit = next.turnTimeLimit;
      room.nopeWindowTime = next.nopeWindowTime;
      room.alterFutureTime = next.alterFutureTime;

      if (room.status === 'playing' && room.engine?.gameState) {
        const gs = room.engine.gameState;
        gs.timers = next;

        // Áp dụng ngay cho cửa sổ đang mở, không chỉ lần sau.
        if (gs.waitingFor === 'nope' && room.nopeTimer) {
          openNopeWindow(io, room, { playerId: gs.windowOwnerId });
        } else if (gs.waitingFor === 'alter_future' && room.alterFutureTimer) {
          scheduleAlterFutureTimeout(io, room);
        }

        broadcastStates(io, room);
      } else {
        broadcastLobby(room);
      }
    });

    socket.on(EVENTS.SET_DECK_THEME, (payload = {}) => {
      const room = findRoomByCode(payload.roomCode);
      if (!room) return socket.emit(EVENTS.ERROR, { message: 'Phòng không tồn tại' });
      if (room.status !== 'lobby') {
        return socket.emit(EVENTS.ERROR, { message: 'Chỉ đổi bộ bài khi ở phòng chờ' });
      }
      const requester = room.players.find((p) => p.id === socket.id);
      if (!requester?.isHost) {
        return socket.emit(EVENTS.ERROR, { message: 'Chỉ chủ phòng mới đổi bộ bài được' });
      }
      if (!DECK_THEME_IDS.includes(payload.deckTheme)) {
        return socket.emit(EVENTS.ERROR, { message: 'Bộ bài không hợp lệ' });
      }
      room.deckTheme = payload.deckTheme;
      broadcastLobby(room);
    });

    socket.on(EVENTS.START_GAME, (payload = {}) => {
      const room = findRoomByCode(payload.roomCode);
      if (!room) return socket.emit(EVENTS.ERROR, { message: 'Phòng không tồn tại' });
      if (room.status !== 'lobby') return socket.emit(EVENTS.ERROR, { message: 'Ván đấu đã bắt đầu' });
      const requester = room.players.find(p => p.id === socket.id);
      if (!requester?.isHost) return socket.emit(EVENTS.ERROR, { message: 'Chỉ chủ phòng mới bắt đầu được' });
      if (room.players.length < CONFIG.MIN_PLAYERS) {
        return socket.emit(EVENTS.ERROR, { message: 'Cần ít nhất 2 người chơi (có thể thêm Bot)' });
      }
      startGameInternal(room);
    });

    socket.on(EVENTS.RESTART_GAME, (payload = {}) => {
      const room = findRoomByCode(payload.roomCode);
      if (!room) return socket.emit(EVENTS.ERROR, { message: 'Phòng không tồn tại' });
      const gsStatus = room.engine?.gameState?.status;
      if (gsStatus !== 'finished') return socket.emit(EVENTS.ERROR, { message: 'Ván đấu chưa kết thúc' });
      const requester = room.players.find(p => p.id === socket.id);
      if (!requester?.isHost) return socket.emit(EVENTS.ERROR, { message: 'Chỉ chủ phòng mới chơi lại được' });
      startGameInternal(room);
    });

    socket.on(EVENTS.LEAVE_ROOM, (payload = {}) => {
      const room = findRoomByCode(payload.roomCode);
      if (!room) return;
      const player = room.players.find(p => p.id === socket.id && !p.isBot);
      if (!player) return;

      socket.leave(room.roomCode);
      promoteNextHost(room, socket.id);

      if (room.status === 'playing') {
        // Giữ người chơi trong danh sách để bot/zombie đi thay, tránh kẹt lượt.
        player.removed = true;
        room.engine?.addLog(`🚪 ${player.name} đã rời phòng.`);

        const anyHumanLeft = room.players.some(p => !p.isBot && !p.removed);
        if (!anyHumanLeft) {
          clearRoomTimers(room);
          roomManager.rooms.delete(room.roomCode);
          return;
        }

        broadcastStates(io, room);
        scheduleBots(io, room);
        return;
      }

      const remaining = roomManager.removePlayer(room.roomCode, socket.id);
      if (!remaining) return;
      if (!remaining.players.some(p => !p.isBot)) {
        clearRoomTimers(remaining);
        roomManager.rooms.delete(remaining.roomCode);
        return;
      }
      broadcastLobby(remaining);
    });

    // ==================== HÀNH ĐỘNG TRONG GAME ====================
    const gameAction = (type) => (payload = {}) => {
      const room = findRoomByCode(payload.roomCode);
      if (!room) return socket.emit(EVENTS.ERROR, { message: 'Phòng không tồn tại' });
      const res = performAction(io, room, socket.id, type, payload);
      if (res?.error) socket.emit(EVENTS.ERROR, { message: res.error });
    };

    socket.on(EVENTS.PLAY_CARD, gameAction('play_card'));
    socket.on(EVENTS.DRAW_CARD, gameAction('draw_card'));
    socket.on(EVENTS.DEFUSE_PLACE, gameAction('defuse_place'));
    socket.on(EVENTS.IMPLODING_PLACE, gameAction('imploding_place'));
    socket.on(EVENTS.NOPE_ACTION, gameAction('nope_action'));
    socket.on(EVENTS.NOPE_PASS, gameAction('nope_pass'));
    socket.on(EVENTS.FAVOR_GIVE, gameAction('favor_give'));
    socket.on(EVENTS.ALTER_FUTURE_SUBMIT, gameAction('alter_future_submit'));
    socket.on(EVENTS.CHOICE_RESPONSE, gameAction('choice_response'));

    // ==================== CHAT ====================
    socket.on(EVENTS.CHAT_MESSAGE, (payload = {}) => {
      const room = findRoomByCode(payload.roomCode);
      if (!room) return;
      const player = room.players.find(p => p.id === socket.id);
      if (!player) return;
      const message = String(payload.message || '').trim().slice(0, 200);
      if (!message) return;
      io.to(room.roomCode).emit(EVENTS.CHAT_BROADCAST, {
        playerId: socket.id,
        playerName: player.name,
        message,
        ts: Date.now(),
      });
    });

    // ==================== NGẮT KẾT NỐI ====================
    socket.on('disconnect', () => {
      console.log(`Người chơi ngắt kết nối: ${socket.id}`);
      for (const [roomCode, room] of roomManager.rooms) {
        const player = room.players.find(p => p.id === socket.id && !p.isBot);
        if (!player) continue;

        if (room.status === 'playing') {
          io.to(roomCode).emit(EVENTS.PLAYER_DISCONNECTED, {
            playerId: socket.id,
            playerName: player.name,
          });
          roomManager.setReconnectTimer(roomCode, socket.id, (code, pid) => {
            const r = roomManager.getRoom(code);
            if (!r) return;
            const pl = r.players.find(p => p.id === pid);
            if (pl) {
              promoteNextHost(r, pid);
              pl.removed = true;
            }

            const anyHumanLeft = r.players.some(p => !p.isBot && !p.removed);
            if (!anyHumanLeft) {
              if (r.nopeTimer) clearTimeout(r.nopeTimer);
              if (r.botTimer) clearTimeout(r.botTimer);
              if (r.alterFutureTimer) clearTimeout(r.alterFutureTimer);
              roomManager.rooms.delete(code);
              return;
            }
            // người này có thể đang giữ lượt — bot/zombie sẽ đi thay
            broadcastStates(io, r);
            scheduleBots(io, r);
          });
        } else {
          // Giữ ghế trong phòng chờ một lúc để F5/reconnect không mất chỗ.
          roomManager.setReconnectTimer(roomCode, socket.id, (code, pid) => {
            const r = roomManager.getRoom(code);
            if (!r || r.status !== 'lobby') return;
            const remaining = roomManager.removePlayer(code, pid);
            if (remaining) broadcastLobby(remaining);
          });
        }
        break;
      }
    });
  });
}

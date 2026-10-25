import { v4 as uuidv4 } from 'uuid';
import { CONFIG } from './constants.js';
import { DEFAULT_DECK_THEME } from '../../shared/decks.js';

export class RoomManager {
  constructor() {
    this.rooms = new Map();
    this.reconnectTimers = new Map();
  }

  createRoom(hostId, hostName) {
    let roomCode;
    do {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      roomCode = Array.from({ length: 5 }, () => chars.charAt(Math.floor(Math.random() * chars.length))).join('');
    } while (this.rooms.has(roomCode));

    const room = {
      roomCode,
      players: [{ id: hostId, name: hostName, isHost: true }],
      status: 'lobby',
      gameState: null,
      turnTimeLimit: CONFIG.TURN_TIME_LIMIT,
      nopeWindowTime: CONFIG.NOPE_WINDOW_TIME,
      alterFutureTime: CONFIG.ALTER_FUTURE_TIME,
      deckTheme: DEFAULT_DECK_THEME,
      createdAt: Date.now(),
    };
    this.rooms.set(roomCode, room);
    return roomCode;
  }

  joinRoom(roomCode, playerId, playerName) {
    const room = this.rooms.get(roomCode);
    if (!room) return null;
    if (room.players.length >= CONFIG.MAX_PLAYERS) return null;
    if (room.status !== 'lobby') return null;

    room.players.push({ id: playerId, name: playerName, isHost: false });
    return room;
  }

  getRoom(roomCode) {
    return this.rooms.get(roomCode);
  }

  removePlayer(roomCode, playerId) {
    const room = this.rooms.get(roomCode);
    if (!room) return null;
    room.players = room.players.filter(p => p.id !== playerId);
    if (room.players.length === 0) {
      if (room.nopeTimer) clearTimeout(room.nopeTimer);
      if (room.botTimer) clearTimeout(room.botTimer);
      if (room.alterFutureTimer) clearTimeout(room.alterFutureTimer);
      if (room.turnTimer) clearTimeout(room.turnTimer);
      this.rooms.delete(roomCode);
      return null;
    }
    if (room.players.some(p => p.isHost) === false && room.players.length > 0) {
      room.players[0].isHost = true;
    }
    return room;
  }

  setReconnectTimer(roomCode, playerId, callback) {
    const key = `${roomCode}:${playerId}`;
    if (this.reconnectTimers.has(key)) {
      clearTimeout(this.reconnectTimers.get(key));
    }
    const timer = setTimeout(() => {
      callback(roomCode, playerId);
      this.reconnectTimers.delete(key);
    }, CONFIG.RECONNECT_TIMEOUT * 1000);
    this.reconnectTimers.set(key, timer);
  }

  clearReconnectTimer(roomCode, playerId) {
    const key = `${roomCode}:${playerId}`;
    if (this.reconnectTimers.has(key)) {
      clearTimeout(this.reconnectTimers.get(key));
      this.reconnectTimers.delete(key);
    }
  }
}

import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { registerSocketHandlers } from './socketHandlers.js';
import { RoomManager } from './roomManager.js';
import { GameEngine } from './gameEngine.js';
import { CONFIG } from './constants.js';

const app = express();
const httpServer = createServer(app);

const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:3000')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean);

const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
  },
});

const roomManager = new RoomManager();
registerSocketHandlers(io, roomManager, GameEngine);

// Dọn phòng rác mỗi 60 giây: không còn người thật nào kết nối
setInterval(() => {
  for (const [code, room] of roomManager.rooms) {
    const anyConnectedHuman = room.players.some(p => !p.isBot && !p.removed);
    if (!anyConnectedHuman) {
      if (room.nopeTimer) clearTimeout(room.nopeTimer);
      if (room.botTimer) clearTimeout(room.botTimer);
      if (room.alterFutureTimer) clearTimeout(room.alterFutureTimer);
      if (room.turnTimer) clearTimeout(room.turnTimer);
      roomManager.rooms.delete(code);
    }
  }
}, 60 * 1000);

const PORT = process.env.PORT || 4000;
httpServer.listen(PORT, () => {
  console.log(`🐱💣 Mèo Nổ Server đang chạy tại port ${PORT}`);
});

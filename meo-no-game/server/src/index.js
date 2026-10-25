import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { registerSocketHandlers } from './socketHandlers.js';
import { RoomManager } from './roomManager.js';
import { GameEngine } from './gameEngine.js';
import { CONFIG } from './constants.js';

import cors from 'cors';

const app = express();
const httpServer = createServer(app);

const configuredOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean);

const isOriginAllowed = (origin) => {
  if (!origin) return true; // Cho phép requests không có origin (curl, server-to-server)
  if (configuredOrigins.includes('*') || configuredOrigins.includes(origin)) return true;
  if (origin === 'https://meo-no-six.vercel.app' || origin.endsWith('.vercel.app')) return true;
  if (origin.includes('localhost') || origin.includes('127.0.0.1')) return true;
  return false;
};

app.use(cors({
  origin: (origin, callback) => callback(null, isOriginAllowed(origin)),
  credentials: true,
}));

const io = new Server(httpServer, {
  cors: {
    origin: (origin, callback) => callback(null, isOriginAllowed(origin)),
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

const roomManager = new RoomManager();
registerSocketHandlers(io, roomManager, GameEngine);

// Health check cho Railway
app.get('/health', (_req, res) => res.json({ status: 'ok' }));

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

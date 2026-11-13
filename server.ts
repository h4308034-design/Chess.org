import express from 'express';
import http from 'http';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { WebSocketServer, WebSocket } from 'ws';
import { Chess } from 'chess.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;
const DATA_DIR = path.join(__dirname, 'data');
const STORE_PATH = path.join(DATA_DIR, 'server-store.json');

interface LeaderboardEntry {
  username: string;
  rating: number;
  wins: number;
  games: number;
  xp: number;
  updatedAt: number;
}

interface TournamentEntry {
  id: string;
  name: string;
  timeControl: string;
  format: string;
  status: 'open' | 'active';
  participants: { username: string; rating: number; score: number }[];
}

interface ServerStore {
  leaderboard: LeaderboardEntry[];
  tournaments: TournamentEntry[];
}

function loadStore(): ServerStore {
  try {
    if (fs.existsSync(STORE_PATH)) {
      return JSON.parse(fs.readFileSync(STORE_PATH, 'utf-8')) as ServerStore;
    }
  } catch {
    // fallback to initial store
  }
  return {
    leaderboard: [],
    tournaments: [
      {
        id: 'tourn-ivory-rapid',
        name: 'Chess.org Ivory Rapid Open',
        timeControl: '10+0',
        format: 'Swiss · 5 Rounds',
        status: 'open',
        participants: [],
      },
      {
        id: 'tourn-blitz-arena',
        name: 'Evening Blitz Arena',
        timeControl: '3+2',
        format: 'Arena · 45 min',
        status: 'open',
        participants: [],
      },
      {
        id: 'tourn-classical-study',
        name: 'Classical Founders Cup',
        timeControl: '30+0',
        format: 'Round Robin',
        status: 'open',
        participants: [],
      },
    ],
  };
}

function saveStore(store: ServerStore) {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(STORE_PATH, JSON.stringify(store, null, 2));
  } catch {
    // ignore fs write failures in read-only sandboxes
  }
}

const store = loadStore();

interface PlayerSeat {
  clientId: string;
  username: string;
  rating: number;
  ws: WebSocket | null;
}

interface OnlineRoom {
  roomId: string;
  timeControlLabel: string;
  initialMs: number;
  incrementMs: number;
  fen: string;
  pgn: string;
  moves: string[];
  turn: 'w' | 'b';
  white: PlayerSeat | null;
  black: PlayerSeat | null;
  whiteTimeMs: number;
  blackTimeMs: number;
  lastMoveTimestamp: number;
  status: 'waiting' | 'active' | 'finished';
  winner: 'w' | 'b' | 'draw' | null;
  termination: string | null;
  drawOfferBy: 'w' | 'b' | null;
  rematchRequests: { w: boolean; b: boolean };
}

const rooms = new Map<string, OnlineRoom>();
const matchmakingQueue: {
  clientId: string;
  username: string;
  rating: number;
  timeControlLabel: string;
  initialMs: number;
  incrementMs: number;
  ws: WebSocket;
}[] = [];

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return rooms.has(code) ? generateRoomCode() : code;
}

function serializeRoom(room: OnlineRoom) {
  return {
    roomId: room.roomId,
    timeControlLabel: room.timeControlLabel,
    initialMs: room.initialMs,
    incrementMs: room.incrementMs,
    fen: room.fen,
    pgn: room.pgn,
    moves: room.moves,
    turn: room.turn,
    white: room.white
      ? { clientId: room.white.clientId, username: room.white.username, rating: room.white.rating, connected: room.white.ws?.readyState === WebSocket.OPEN }
      : null,
    black: room.black
      ? { clientId: room.black.clientId, username: room.black.username, rating: room.black.rating, connected: room.black.ws?.readyState === WebSocket.OPEN }
      : null,
    whiteTimeMs: Math.max(0, room.whiteTimeMs),
    blackTimeMs: Math.max(0, room.blackTimeMs),
    status: room.status,
    winner: room.winner,
    termination: room.termination,
    drawOfferBy: room.drawOfferBy,
    rematchRequests: room.rematchRequests,
  };
}

function broadcastRoom(room: OnlineRoom) {
  const payload = JSON.stringify({ type: 'room_state', room: serializeRoom(room) });
  if (room.white?.ws && room.white.ws.readyState === WebSocket.OPEN) {
    room.white.ws.send(payload);
  }
  if (room.black?.ws && room.black.ws.readyState === WebSocket.OPEN) {
    room.black.ws.send(payload);
  }
}

// Server-authoritative clock tick (250ms interval)
setInterval(() => {
  const now = Date.now();
  for (const room of rooms.values()) {
    if (room.status !== 'active') continue;
    if (room.moves.length === 0) {
      room.lastMoveTimestamp = now;
      continue;
    }
    const elapsed = now - room.lastMoveTimestamp;
    room.lastMoveTimestamp = now;

    if (room.turn === 'w') {
      room.whiteTimeMs -= elapsed;
      if (room.whiteTimeMs <= 0) {
        room.whiteTimeMs = 0;
        room.status = 'finished';
        room.winner = 'b';
        room.termination = 'Black wins on time';
        broadcastRoom(room);
      }
    } else {
      room.blackTimeMs -= elapsed;
      if (room.blackTimeMs <= 0) {
        room.blackTimeMs = 0;
        room.status = 'finished';
        room.winner = 'w';
        room.termination = 'White wins on time';
        broadcastRoom(room);
      }
    }
  }
}, 250);

async function startServer() {
  const app = express();
  app.use(express.json());

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, activeRooms: rooms.size, queuedPlayers: matchmakingQueue.length });
  });

  app.get('/api/rooms', (_req, res) => {
    const publicRooms = Array.from(rooms.values())
      .filter((r) => r.status === 'waiting')
      .map((r) => ({
        roomId: r.roomId,
        timeControlLabel: r.timeControlLabel,
        host: r.white?.username ?? r.black?.username ?? 'Host',
        hostRating: r.white?.rating ?? r.black?.rating ?? 1200,
      }));
    res.json({ rooms: publicRooms });
  });

  app.get('/api/leaderboard', (_req, res) => {
    const sorted = [...store.leaderboard].sort((a, b) => b.rating - a.rating).slice(0, 50);
    res.json({ leaderboard: sorted });
  });

  app.post('/api/leaderboard/sync', (req, res) => {
    const { username, rating, wins, games, xp } = req.body ?? {};
    if (!username || typeof rating !== 'number') {
      res.status(400).json({ error: 'Invalid profile payload' });
      return;
    }
    const existingIdx = store.leaderboard.findIndex(
      (e) => e.username.toLowerCase() === String(username).toLowerCase(),
    );
    const entry: LeaderboardEntry = {
      username: String(username).slice(0, 24),
      rating: Math.round(rating),
      wins: Number(wins) || 0,
      games: Number(games) || 0,
      xp: Number(xp) || 0,
      updatedAt: Date.now(),
    };
    if (existingIdx >= 0) store.leaderboard[existingIdx] = entry;
    else store.leaderboard.push(entry);
    saveStore(store);
    res.json({ ok: true, entry });
  });

  app.get('/api/tournaments', (_req, res) => {
    res.json({ tournaments: store.tournaments });
  });

  app.post('/api/tournaments/:id/join', (req, res) => {
    const { username, rating } = req.body ?? {};
    const t = store.tournaments.find((item) => item.id === req.params.id);
    if (!t) {
      res.status(404).json({ error: 'Tournament not found' });
      return;
    }
    if (!username) {
      res.status(400).json({ error: 'Username is required' });
      return;
    }
    const exists = t.participants.some(
      (p) => p.username.toLowerCase() === String(username).toLowerCase(),
    );
    if (!exists) {
      t.participants.push({
        username: String(username).slice(0, 24),
        rating: Number(rating) || 1200,
        score: 0,
      });
      saveStore(store);
    }
    res.json({ tournament: t });
  });

  const server = http.createServer(app);
  const wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws) => {
    let boundRoomId: string | null = null;
    let boundClientId: string | null = null;

    ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw.toString());
        const clientId = String(msg.clientId || '');
        boundClientId = clientId || boundClientId;

        if (msg.type === 'create_room') {
          const roomId = generateRoomCode();
          const initialMs = Math.max(10000, (Number(msg.initialSeconds) || 600) * 1000);
          const incrementMs = Math.max(0, (Number(msg.incrementSeconds) || 0) * 1000);
          const preferColor: 'w' | 'b' = msg.color === 'b' ? 'b' : 'w';
          const seat: PlayerSeat = {
            clientId,
            username: String(msg.username || 'Player').slice(0, 24),
            rating: Number(msg.rating) || 1200,
            ws,
          };
          const room: OnlineRoom = {
            roomId,
            timeControlLabel: String(msg.timeControlLabel || '10+0'),
            initialMs,
            incrementMs,
            fen: new Chess().fen(),
            pgn: '',
            moves: [],
            turn: 'w',
            white: preferColor === 'w' ? seat : null,
            black: preferColor === 'b' ? seat : null,
            whiteTimeMs: initialMs,
            blackTimeMs: initialMs,
            lastMoveTimestamp: Date.now(),
            status: 'waiting',
            winner: null,
            termination: null,
            drawOfferBy: null,
            rematchRequests: { w: false, b: false },
          };
          rooms.set(roomId, room);
          boundRoomId = roomId;
          broadcastRoom(room);
          return;
        }

        if (msg.type === 'join_room') {
          const roomId = String(msg.roomId || '').toUpperCase().trim();
          const room = rooms.get(roomId);
          if (!room) {
            ws.send(JSON.stringify({ type: 'error', message: `Room ${roomId} was not found.` }));
            return;
          }

          // Reconnect check
          if (room.white?.clientId === clientId) {
            room.white.ws = ws;
            boundRoomId = roomId;
            broadcastRoom(room);
            return;
          }
          if (room.black?.clientId === clientId) {
            room.black.ws = ws;
            boundRoomId = roomId;
            broadcastRoom(room);
            return;
          }

          const seat: PlayerSeat = {
            clientId,
            username: String(msg.username || 'Challenger').slice(0, 24),
            rating: Number(msg.rating) || 1200,
            ws,
          };
          if (!room.white) room.white = seat;
          else if (!room.black) room.black = seat;
          else {
            ws.send(JSON.stringify({ type: 'error', message: `Room ${roomId} is already full.` }));
            return;
          }

          boundRoomId = roomId;
          if (room.white && room.black && room.status === 'waiting') {
            room.status = 'active';
            room.lastMoveTimestamp = Date.now();
          }
          broadcastRoom(room);
          return;
        }

        if (msg.type === 'quick_match') {
          const timeControlLabel = String(msg.timeControlLabel || '10+0');
          const initialMs = Math.max(10000, (Number(msg.initialSeconds) || 600) * 1000);
          const incrementMs = Math.max(0, (Number(msg.incrementSeconds) || 0) * 1000);

          // Remove any stale queue entry for this client
          const existingIdx = matchmakingQueue.findIndex((q) => q.clientId === clientId);
          if (existingIdx >= 0) matchmakingQueue.splice(existingIdx, 1);

          const matchIdx = matchmakingQueue.findIndex(
            (q) =>
              q.timeControlLabel === timeControlLabel &&
              q.clientId !== clientId &&
              q.ws.readyState === WebSocket.OPEN,
          );

          if (matchIdx >= 0) {
            const opponent = matchmakingQueue.splice(matchIdx, 1)[0];
            const roomId = generateRoomCode();
            const room: OnlineRoom = {
              roomId,
              timeControlLabel,
              initialMs,
              incrementMs,
              fen: new Chess().fen(),
              pgn: '',
              moves: [],
              turn: 'w',
              white: {
                clientId: opponent.clientId,
                username: opponent.username,
                rating: opponent.rating,
                ws: opponent.ws,
              },
              black: {
                clientId,
                username: String(msg.username || 'Player').slice(0, 24),
                rating: Number(msg.rating) || 1200,
                ws,
              },
              whiteTimeMs: initialMs,
              blackTimeMs: initialMs,
              lastMoveTimestamp: Date.now(),
              status: 'active',
              winner: null,
              termination: null,
              drawOfferBy: null,
              rematchRequests: { w: false, b: false },
            };
            rooms.set(roomId, room);
            boundRoomId = roomId;
            broadcastRoom(room);
          } else {
            matchmakingQueue.push({
              clientId,
              username: String(msg.username || 'Player').slice(0, 24),
              rating: Number(msg.rating) || 1200,
              timeControlLabel,
              initialMs,
              incrementMs,
              ws,
            });
            ws.send(JSON.stringify({ type: 'queued', timeControlLabel, queueSize: matchmakingQueue.length }));
          }
          return;
        }

        if (msg.type === 'cancel_queue') {
          const idx = matchmakingQueue.findIndex((q) => q.clientId === clientId);
          if (idx >= 0) matchmakingQueue.splice(idx, 1);
          ws.send(JSON.stringify({ type: 'queue_cancelled' }));
          return;
        }

        // Room actions
        const room = rooms.get(String(msg.roomId || boundRoomId || ''));
        if (!room) return;
        const playerColor: 'w' | 'b' | null =
          room.white?.clientId === clientId ? 'w' : room.black?.clientId === clientId ? 'b' : null;
        if (!playerColor) return;

        if (msg.type === 'make_move' && room.status === 'active') {
          if (room.turn !== playerColor) {
            ws.send(JSON.stringify({ type: 'error', message: 'Not your turn.' }));
            return;
          }
          const chess = new Chess(room.fen);
          const mv = chess.move({
            from: msg.from,
            to: msg.to,
            promotion: msg.promotion || undefined,
          });
          if (!mv) {
            ws.send(JSON.stringify({ type: 'error', message: 'Illegal move rejected by server.' }));
            return;
          }

          const now = Date.now();
          if (room.moves.length > 0) {
            const elapsed = now - room.lastMoveTimestamp;
            if (playerColor === 'w') room.whiteTimeMs = Math.max(0, room.whiteTimeMs - elapsed + room.incrementMs);
            else room.blackTimeMs = Math.max(0, room.blackTimeMs - elapsed + room.incrementMs);
          } else {
            if (playerColor === 'w') room.whiteTimeMs += room.incrementMs;
            else room.blackTimeMs += room.incrementMs;
          }
          room.lastMoveTimestamp = now;
          room.fen = chess.fen();
          room.moves.push(mv.san);
          room.pgn = room.moves.map((s, idx) => (idx % 2 === 0 ? `${idx / 2 + 1}. ${s}` : s)).join(' ');
          room.turn = chess.turn();
          room.drawOfferBy = null;

          if (chess.isCheckmate()) {
            room.status = 'finished';
            room.winner = playerColor;
            room.termination = `Checkmate — ${playerColor === 'w' ? 'White' : 'Black'} wins`;
          } else if (chess.isStalemate()) {
            room.status = 'finished';
            room.winner = 'draw';
            room.termination = 'Draw by stalemate';
          } else if (chess.isInsufficientMaterial()) {
            room.status = 'finished';
            room.winner = 'draw';
            room.termination = 'Draw by insufficient material';
          } else if (chess.isThreefoldRepetition()) {
            room.status = 'finished';
            room.winner = 'draw';
            room.termination = 'Draw by repetition';
          } else if (chess.isDraw()) {
            room.status = 'finished';
            room.winner = 'draw';
            room.termination = 'Draw by 50-move rule';
          }

          broadcastRoom(room);
          return;
        }

        if (msg.type === 'resign' && room.status === 'active') {
          room.status = 'finished';
          room.winner = playerColor === 'w' ? 'b' : 'w';
          room.termination = `${playerColor === 'w' ? 'White' : 'Black'} resigned`;
          broadcastRoom(room);
          return;
        }

        if (msg.type === 'offer_draw' && room.status === 'active') {
          room.drawOfferBy = playerColor;
          broadcastRoom(room);
          return;
        }

        if (msg.type === 'accept_draw' && room.status === 'active' && room.drawOfferBy && room.drawOfferBy !== playerColor) {
          room.status = 'finished';
          room.winner = 'draw';
          room.termination = 'Draw by mutual agreement';
          room.drawOfferBy = null;
          broadcastRoom(room);
          return;
        }

        if (msg.type === 'decline_draw' && room.drawOfferBy && room.drawOfferBy !== playerColor) {
          room.drawOfferBy = null;
          broadcastRoom(room);
          return;
        }

        if (msg.type === 'request_rematch' && room.status === 'finished') {
          room.rematchRequests[playerColor] = true;
          if (room.rematchRequests.w && room.rematchRequests.b) {
            const oldWhite = room.white;
            room.white = room.black;
            room.black = oldWhite;
            room.fen = new Chess().fen();
            room.pgn = '';
            room.moves = [];
            room.turn = 'w';
            room.whiteTimeMs = room.initialMs;
            room.blackTimeMs = room.initialMs;
            room.lastMoveTimestamp = Date.now();
            room.status = 'active';
            room.winner = null;
            room.termination = null;
            room.drawOfferBy = null;
            room.rematchRequests = { w: false, b: false };
          }
          broadcastRoom(room);
        }
      } catch {
        // ignore malformed packets
      }
    });

    ws.on('close', () => {
      if (boundClientId) {
        const idx = matchmakingQueue.findIndex((q) => q.clientId === boundClientId);
        if (idx >= 0) matchmakingQueue.splice(idx, 1);
      }
      if (boundRoomId) {
        const room = rooms.get(boundRoomId);
        if (room) broadcastRoom(room);
      }
    });
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Chess.org server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();

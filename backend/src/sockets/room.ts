import { Server, Socket } from 'socket.io';
import { Chess, Square } from 'chess.js';
import { rooms, Room, getBoardUpdate, ActiveEvent } from '../models/room';
import { pickRandomEvent, applyEventEffect } from '../events';
import {
  JoinRoomPayload,
  MakeMovePayload,
  VotePayload,
  RoomStatePayload,
  EventStartPayload,
  EventResultPayload,
} from '../types';

const MOVES_PER_EVENT = 6; // event triggers every N total moves
const EVENT_DURATION_S = parseInt(process.env.EVENT_DURATION_S ?? '30', 10);

const SOCKET_ROOM = (roomId: string) => `room:${roomId}`;

// ─── Event lifecycle ─────────────────────────────────────────────────────────

function startEvent(io: Server, room: Room): void {
  if (room.chess.status !== 'active') return;
  if (room.activeEvent) return; // already running

  const def = pickRandomEvent();
  const event: ActiveEvent = {
    ...def,
    duration: EVENT_DURATION_S,
    secondsLeft: EVENT_DURATION_S,
    votes: [0, 0],
    deviceVotes: new Map(),
    tickInterval: null,
    endTimer: null,
  };
  room.activeEvent = event;

  const payload: EventStartPayload = {
    eventId: event.eventId,
    question: event.question,
    options: event.options,
    duration: event.duration,
    secondsLeft: event.secondsLeft,
  };
  io.to(SOCKET_ROOM(room.roomId)).emit('room:event:start', payload);

  event.tickInterval = setInterval(() => {
    event.secondsLeft = Math.max(0, event.secondsLeft - 1);
    io.to(SOCKET_ROOM(room.roomId)).emit('room:event:tick', {
      secondsLeft: event.secondsLeft,
    });
    if (event.secondsLeft <= 0 && event.tickInterval) {
      clearInterval(event.tickInterval);
      event.tickInterval = null;
    }
  }, 1000);

  event.endTimer = setTimeout(() => finalizeEvent(io, room), EVENT_DURATION_S * 1000);
}

function finalizeEvent(io: Server, room: Room): void {
  const event = room.activeEvent;
  if (!event) return;

  if (event.tickInterval) { clearInterval(event.tickInterval); event.tickInterval = null; }
  if (event.endTimer) { clearTimeout(event.endTimer); event.endTimer = null; }

  const winningOption: 0 | 1 = event.votes[0] >= event.votes[1] ? 0 : 1;

  const result: EventResultPayload = {
    eventId: event.eventId,
    options: event.options,
    winningOption,
    votes: event.votes,
  };
  io.to(SOCKET_ROOM(room.roomId)).emit('room:event:result', result);

  applyEventEffect(room, event.eventId, winningOption);

  io.to(SOCKET_ROOM(room.roomId)).emit('room:boardUpdate', getBoardUpdate(room));

  room.activeEvent = null;
}

// ─── Socket handlers ─────────────────────────────────────────────────────────

export function registerRoomHandlers(io: Server, socket: Socket): void {

  socket.on('room:join', ({ roomId, role, token }: JoinRoomPayload) => {
    const room = rooms.get(roomId);
    if (!room) {
      socket.emit('room:error', { message: 'Room not found' });
      return;
    }

    let color: 'white' | 'black' | undefined;

    if (role === 'player') {
      if (!token) {
        socket.emit('room:error', { message: 'Token required for player role' });
        return;
      }
      if (token === room.tokens.white) {
        color = 'white';
        room.sockets.white = socket.id;
      } else if (token === room.tokens.black) {
        color = 'black';
        room.sockets.black = socket.id;
      } else {
        socket.emit('room:error', { message: 'Invalid token' });
        return;
      }

      if (room.sockets.white && room.sockets.black && room.chess.status === 'waiting') {
        room.chess.status = 'active';
      }
    } else if (role === 'spectator') {
      room.sockets.spectators.add(socket.id);
    } else if (role === 'audience') {
      room.sockets.audience.add(socket.id);
    }

    socket.join(SOCKET_ROOM(roomId));

    const activeEventPayload: EventStartPayload | null = room.activeEvent
      ? {
          eventId: room.activeEvent.eventId,
          question: room.activeEvent.question,
          options: room.activeEvent.options,
          duration: room.activeEvent.duration,
          secondsLeft: room.activeEvent.secondsLeft,
        }
      : null;

    const state: RoomStatePayload = {
      roomId,
      role,
      color,
      board: getBoardUpdate(room),
      activeEvent: activeEventPayload,
      qrAudience: role === 'spectator' ? room.qr.audience : undefined,
    };
    socket.emit('room:state', state);

    io.to(SOCKET_ROOM(roomId)).emit('room:boardUpdate', getBoardUpdate(room));
  });

  socket.on('room:move', ({ roomId, token, move }: MakeMovePayload) => {
    const room = rooms.get(roomId);
    if (!room || room.chess.status !== 'active') return;

    const expectedColor: 'white' | 'black' =
      room.chess.currentTurn === 'w' ? 'white' : 'black';

    if (room.tokens[expectedColor] !== token) {
      socket.emit('room:error', { message: 'Not your turn or invalid token' });
      return;
    }

    const chess = new Chess(room.chess.fen);
    try {
      const from = move.slice(0, 2) as Square;
      const to = move.slice(2, 4) as Square;
      const promotion = move.length >= 5 ? move[4] : 'q';

      const movingPiece = chess.get(from);
      const result = chess.move({ from, to, promotion });

      // Track special pawn overlays through moves
      if (movingPiece && movingPiece.type === 'p') {
        const ck = movingPiece.color === 'w' ? 'white' : 'black';
        const sp = room.specialPawns[ck];
        const fi = sp.flag.indexOf(from); if (fi !== -1) sp.flag[fi] = to;
        const hi = sp.hair.indexOf(from); if (hi !== -1) sp.hair[hi] = to;
        // Promoted pawn loses its special
        if (result.flags.includes('p')) {
          sp.flag = sp.flag.filter(s => s !== to);
          sp.hair = sp.hair.filter(s => s !== to);
        }
      }
      // Remove special from captured pawn
      if (result.captured === 'p') {
        const oppCk = movingPiece && movingPiece.color === 'w' ? 'black' : 'white';
        const oppSp = room.specialPawns[oppCk];
        const capSq = result.flags.includes('e') ? (to[0] + from[1]) as Square : to;
        oppSp.flag = oppSp.flag.filter(s => s !== capSq);
        oppSp.hair = oppSp.hair.filter(s => s !== capSq);
      }

      room.chess.fen = chess.fen();
      room.chess.currentTurn = chess.turn() as 'w' | 'b';
      room.chess.lastMove = move;
      room.chess.moveCount++;

      if (chess.isGameOver()) {
        room.chess.status = 'finished';
        room.chess.winner = chess.isCheckmate()
          ? chess.turn() === 'w' ? 'black' : 'white'
          : 'draw';

        if (room.activeEvent) finalizeEvent(io, room);
      } else if (room.chess.moveCount % MOVES_PER_EVENT === 0) {
        startEvent(io, room);
      }

      io.to(SOCKET_ROOM(roomId)).emit('room:boardUpdate', getBoardUpdate(room));
    } catch {
      socket.emit('room:error', { message: `Invalid move: ${move}` });
    }
  });

  socket.on('room:vote', ({ roomId, deviceId, option }: VotePayload) => {
    const room = rooms.get(roomId);
    if (!room?.activeEvent) return;

    const event = room.activeEvent;
    if (event.deviceVotes.has(deviceId)) return;

    event.deviceVotes.set(deviceId, option);
    event.votes[option]++;
  });

  socket.on('disconnecting', () => {
    for (const socketRoom of socket.rooms) {
      if (!socketRoom.startsWith('room:')) continue;
      const roomId = socketRoom.slice(5);
      const room = rooms.get(roomId);
      if (!room) continue;

      if (room.sockets.white === socket.id) {
        room.sockets.white = null;
        if (room.chess.status === 'active') room.chess.status = 'waiting';
      }
      if (room.sockets.black === socket.id) {
        room.sockets.black = null;
        if (room.chess.status === 'active') room.chess.status = 'waiting';
      }
      room.sockets.spectators.delete(socket.id);
      room.sockets.audience.delete(socket.id);

      io.to(socketRoom).emit('room:boardUpdate', getBoardUpdate(room));
    }
  });
}

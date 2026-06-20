import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import QRCode from 'qrcode';
import { Chess } from 'chess.js';
import { rooms, Room } from '../models/room';
import { CreateRoomResponse } from '../types';

const router = Router();

function generateRoomId(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let id = '';
  for (let i = 0; i < 6; i++) {
    id += chars[Math.floor(Math.random() * chars.length)];
  }
  return id;
}

router.post('/', async (req: Request, res: Response) => {
  const host = req.get('host') ?? 'localhost:3000';
  const origin = process.env.CLIENT_URL ?? `${req.protocol}://${host}`;

  let roomId = generateRoomId();
  while (rooms.has(roomId)) roomId = generateRoomId();

  const tokenWhite = uuidv4();
  const tokenBlack = uuidv4();

  const joinUrl = `${origin}/play/${roomId}?token=${tokenBlack}`;
  const audienceUrl = `${origin}/audience/${roomId}`;

  const [qrJoinBlack, qrAudience] = await Promise.all([
    QRCode.toDataURL(joinUrl, { width: 300, margin: 2 }),
    QRCode.toDataURL(audienceUrl, { width: 300, margin: 2 }),
  ]);

  const chess = new Chess();

  const room: Room = {
    roomId,
    tokens: { white: tokenWhite, black: tokenBlack },
    chess: {
      fen: chess.fen(),
      status: 'waiting',
      winner: null,
      currentTurn: 'w',
      lastMove: null,
      moveCount: 0,
    },
    sockets: {
      white: null,
      black: null,
      spectators: new Set(),
      audience: new Set(),
    },
    activeEvent: null,
    qr: { joinBlack: qrJoinBlack, audience: qrAudience },
    createdAt: new Date(),
  };

  rooms.set(roomId, room);

  const response: CreateRoomResponse = {
    roomId,
    tokenWhite,
    tokenBlack,
    qrJoinBlack,
    qrAudience,
  };

  res.status(201).json(response);
});

router.get('/:id', (req: Request, res: Response) => {
  const room = rooms.get(req.params['id'] as string);
  if (!room) {
    res.status(404).json({ error: 'Room not found' });
    return;
  }
  // Never expose tokens over GET
  res.json({
    roomId: room.roomId,
    status: room.chess.status,
    players: { white: !!room.sockets.white, black: !!room.sockets.black },
    createdAt: room.createdAt,
  });
});

export default router;

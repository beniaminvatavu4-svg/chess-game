import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import QRCode from 'qrcode';
import { Chess, Square } from 'chess.js';
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

function generateSpecialPawns(chess: Chess): Room['specialPawns'] {
  function assignColor(squares: string[]) {
    const shuffled = [...squares].sort(() => Math.random() - 0.5);

    // Strict 1-3 per category, no normal pawns, sum = 8
    // Only valid split: two categories get 3, one gets 2 — randomly which gets 2
    const counts: [number, number, number] = [3, 3, 2];
    counts.sort(() => Math.random() - 0.5);
    const [missingCount, flagCount, hairCount] = counts;

    const missing = shuffled.slice(0, missingCount);
    const flag   = shuffled.slice(missingCount, missingCount + flagCount);
    const hair   = shuffled.slice(missingCount + flagCount, missingCount + flagCount + hairCount);

    return { flag, hair, missing };
  }

  const white = assignColor(['a2','b2','c2','d2','e2','f2','g2','h2']);
  const black = assignColor(['a7','b7','c7','d7','e7','f7','g7','h7']);

  for (const sq of white.missing) chess.remove(sq as Square);
  for (const sq of black.missing) chess.remove(sq as Square);

  return { white, black };
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
  const specialPawns = generateSpecialPawns(chess);
  const specialRooks: Room['specialRooks'] = {
    white: (['a1', 'h1'] as const).filter(() => Math.random() < 0.5),
    black: (['a8', 'h8'] as const).filter(() => Math.random() < 0.5),
  };

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
    specialPawns,
    specialRooks,
    inactiveKings: { white: true, black: true },
    inactiveQueens: { white: true, black: true },
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

router.get('/latest', (_req: Request, res: Response) => {
  let latest: Room | null = null;
  for (const room of rooms.values()) {
    if (!latest || room.createdAt > latest.createdAt) latest = room;
  }
  if (!latest) { res.status(404).json({ error: 'No rooms' }); return; }
  res.json({ roomId: latest.roomId });
});

router.get('/:id', (req: Request, res: Response) => {
  const room = rooms.get(req.params['id'] as string);
  if (!room) {
    res.status(404).json({ error: 'Room not found' });
    return;
  }
  res.json({
    roomId: room.roomId,
    status: room.chess.status,
    players: { white: !!room.sockets.white, black: !!room.sockets.black },
    createdAt: room.createdAt,
  });
});

export default router;

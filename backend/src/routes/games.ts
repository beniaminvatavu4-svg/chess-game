import { Router, Request, Response } from 'express';
import { games, Game } from '../models/game';
import { Chess } from 'chess.js';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

router.post('/', (_req: Request, res: Response) => {
  const chess = new Chess();
  const game: Game = {
    id: uuidv4(),
    fen: chess.fen(),
    players: { white: null, black: null },
    status: 'waiting',
    winner: null,
    createdAt: new Date(),
  };
  games.set(game.id, game);
  res.status(201).json(game);
});

router.get('/', (_req: Request, res: Response) => {
  res.json(Array.from(games.values()));
});

router.get('/:id', (req: Request, res: Response) => {
  const game = games.get(req.params['id'] as string);
  if (!game) {
    res.status(404).json({ error: 'Game not found' });
    return;
  }
  res.json(game);
});

export default router;

import { Server, Socket } from 'socket.io';
import { Chess, Square } from 'chess.js';
import { games } from '../models/game';

export function registerChessHandlers(io: Server, socket: Socket): void {
  socket.on('join-game', ({ gameId, color }: { gameId: string; color: 'white' | 'black' }) => {
    const game = games.get(gameId);
    if (!game) {
      socket.emit('error', { message: 'Game not found' });
      return;
    }
    game.players[color] = socket.id;
    game.status = game.players.white && game.players.black ? 'active' : 'waiting';
    socket.join(gameId);
    io.to(gameId).emit('game-update', game);
  });

  socket.on('make-move', ({ gameId, move }: { gameId: string; move: string }) => {
    const game = games.get(gameId);
    if (!game || game.status !== 'active') return;

    const chess = new Chess(game.fen);
    try {
      const from = move.slice(0, 2) as Square;
      const to = move.slice(2, 4) as Square;
      const promotion = move.length >= 5 ? move[4] : 'q';
      chess.move({ from, to, promotion });
      game.fen = chess.fen();

      if (chess.isGameOver()) {
        game.status = 'finished';
        if (chess.isCheckmate()) {
          game.winner = chess.turn() === 'w' ? 'black' : 'white';
        } else {
          game.winner = 'draw';
        }
      }
      io.to(gameId).emit('game-update', game);
    } catch {
      socket.emit('invalid-move', { move });
    }
  });

  socket.on('disconnecting', () => {
    for (const gameId of socket.rooms) {
      const game = games.get(gameId);
      if (!game) continue;
      if (game.players.white === socket.id) game.players.white = null;
      if (game.players.black === socket.id) game.players.black = null;
      if (game.status === 'active') game.status = 'waiting';
      io.to(gameId).emit('game-update', game);
    }
  });
}

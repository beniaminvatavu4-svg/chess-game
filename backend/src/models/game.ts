export interface Game {
  id: string;
  fen: string;
  players: { white: string | null; black: string | null };
  status: 'waiting' | 'active' | 'finished';
  winner: 'white' | 'black' | 'draw' | null;
  createdAt: Date;
}

export const games = new Map<string, Game>();

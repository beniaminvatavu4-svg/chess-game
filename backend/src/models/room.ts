import { BoardUpdate } from '../types';

export interface ActiveEvent {
  eventId: string;
  question: string;
  options: [string, string];
  duration: number;
  secondsLeft: number;
  votes: [number, number];
  deviceVotes: Map<string, 0 | 1>;
  tickInterval: ReturnType<typeof setInterval> | null;
  endTimer: ReturnType<typeof setTimeout> | null;
}

export interface Room {
  roomId: string;
  tokens: { white: string; black: string };
  chess: {
    fen: string;
    status: 'waiting' | 'active' | 'finished';
    winner: 'white' | 'black' | 'draw' | null;
    currentTurn: 'w' | 'b';
    lastMove: string | null;
  };
  sockets: {
    white: string | null;
    black: string | null;
    spectators: Set<string>;
    audience: Set<string>;
  };
  activeEvent: ActiveEvent | null;
  eventTimer: ReturnType<typeof setTimeout> | null;
  qr: {
    joinBlack: string;
    audience: string;
  };
  createdAt: Date;
}

export const rooms = new Map<string, Room>();

export function getBoardUpdate(room: Room): BoardUpdate {
  return {
    fen: room.chess.fen,
    status: room.chess.status,
    winner: room.chess.winner,
    currentTurn: room.chess.currentTurn,
    lastMove: room.chess.lastMove,
    players: {
      white: !!room.sockets.white,
      black: !!room.sockets.black,
    },
  };
}

import { BoardUpdate, SpecialPawns, SpecialRooks, DoubleRedDotRooks, InactiveKings, InactiveQueens } from '../types';

export interface ActiveEvent {
  eventId: string;
  candidateEventIds: [string, string];
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
    moveCount: number;
  };
  sockets: {
    white: string | null;
    black: string | null;
    spectators: Set<string>;
    audience: Set<string>;
  };
  activeEvent: ActiveEvent | null;
  specialPawns: {
    white: { flag: string[]; hair: string[]; missing: string[] };
    black: { flag: string[]; hair: string[]; missing: string[] };
  };
  specialRooks: SpecialRooks;
  doubleRedDotRooks: DoubleRedDotRooks;
  inactiveKings: InactiveKings;
  inactiveQueens: InactiveQueens;
  queensEverActivated: boolean;
  imnActive: boolean;
  imnTimeout: ReturnType<typeof setTimeout> | null;
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
    specialPawns: {
      white: { flag: room.specialPawns.white.flag, hair: room.specialPawns.white.hair },
      black: { flag: room.specialPawns.black.flag, hair: room.specialPawns.black.hair },
    },
    specialRooks: {
      white: [...room.specialRooks.white],
      black: [...room.specialRooks.black],
    },
    doubleRedDotRooks: {
      white: [...room.doubleRedDotRooks.white],
      black: [...room.doubleRedDotRooks.black],
    },
    inactiveKings: { ...room.inactiveKings },
    inactiveQueens: { ...room.inactiveQueens },
    imnActive: room.imnActive,
  };
}

// Mirror of backend/src/types/index.ts — kept in sync manually

export type ClientRole = 'player' | 'spectator' | 'audience';
export type PlayerColor = 'white' | 'black';
export type GameStatus = 'waiting' | 'active' | 'finished';
export type WinnerType = 'white' | 'black' | 'draw' | null;

// ─── Server → Client ─────────────────────────────────────────────────────────

export interface SpecialPawns {
  white: { flag: string[]; hair: string[] };
  black: { flag: string[]; hair: string[] };
}

export interface SpecialRooks {
  white: string[];
  black: string[];
}

export interface DoubleRedDotRooks {
  white: string[];
  black: string[];
}

export interface InactiveKings {
  white: boolean;
  black: boolean;
}

export interface InactiveQueens {
  white: boolean;
  black: boolean;
}

export interface BoardUpdate {
  fen: string;
  status: GameStatus;
  winner: WinnerType;
  currentTurn: 'w' | 'b';
  lastMove: string | null;
  players: { white: boolean; black: boolean };
  specialPawns: SpecialPawns;
  specialRooks: SpecialRooks;
  doubleRedDotRooks: DoubleRedDotRooks;
  inactiveKings: InactiveKings;
  inactiveQueens: InactiveQueens;
  imnActive: boolean;
}

export interface RoomState {
  roomId: string;
  role: ClientRole;
  color?: PlayerColor;
  board: BoardUpdate;
  activeEvent: EventStart | null;
  qrAudience?: string; // base64 data URI, only for spectators
}

export interface EventStart {
  eventId: string;
  question: string;
  options: [string, string];
  duration: number;
  secondsLeft: number;
}

export interface EventTick {
  secondsLeft: number;
}

export interface EventResult {
  eventId: string;
  options: [string, string];
  winningOption: 0 | 1;
  votes: [number, number];
}

// ─── REST ────────────────────────────────────────────────────────────────────

export interface CreateRoomResponse {
  roomId: string;
  tokenWhite: string;
  tokenBlack: string;
  qrJoinBlack: string;
  qrAudience: string;
}

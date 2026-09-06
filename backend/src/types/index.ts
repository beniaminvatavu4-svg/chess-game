// Shared socket payload types for the room system
// All C→S and S→C message shapes are defined here.

export type ClientRole = 'player' | 'spectator' | 'audience';
export type PlayerColor = 'white' | 'black';
export type GameStatus = 'waiting' | 'active' | 'finished';
export type WinnerType = 'white' | 'black' | 'draw' | null;

// ─── Client → Server ─────────────────────────────────────────────────────────

export interface JoinRoomPayload {
  roomId: string;
  role: ClientRole;
  token?: string; // required only for role='player'
}

export interface MakeMovePayload {
  roomId: string;
  token: string;
  move: string; // UCI notation e.g. "e2e4"
}

export interface HostPickPayload {
  roomId: string;
  token: string;
  choice: 0 | 1;
}

export interface TeleportFlagPawnPayload {
  roomId: string;
  token: string;
  from: string;
}

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
  boardRotated: boolean;
  borderActive: boolean;
}

export interface RoomStatePayload {
  roomId: string;
  role: ClientRole;
  color?: PlayerColor; // only for players
  board: BoardUpdate;
  activeEvent: EventStartPayload | null;
  qrAudience?: string;
}

export interface EventStartPayload {
  eventId: string;
  question: string;
  options: [string, string];
}

export interface EventResultPayload {
  eventId: string;
  options: [string, string];
  winningOption: 0 | 1;
  votes: [number, number];
}

export interface RoomErrorPayload {
  message: string;
}

// ─── REST ────────────────────────────────────────────────────────────────────

export interface CreateRoomResponse {
  roomId: string;
  tokenWhite: string;
  tokenBlack: string;
  qrJoinBlack: string; // base64 data URI — QR for player 2's join URL
  qrAudience: string;  // base64 data URI — QR for audience URL
}

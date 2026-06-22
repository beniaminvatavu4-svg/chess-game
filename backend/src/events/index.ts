import { Server } from 'socket.io';
import { Chess, Square } from 'chess.js';
import { Room, getBoardUpdate } from '../models/room';

export interface EventDefinition {
  eventId: string;
  question: string;
  options: [string, string];
}

export const EVENT_DEFINITIONS: EventDefinition[] = [
  {
    eventId: 'diaspora_pawns',
    question: '🇷🇴 Vin pionii din diaspora — fiecare jucător primește pioni cu steag',
    options: ['Da', 'Nu'],
  },
  {
    eventId: 'activate_queens',
    question: '💰 Statul decontează — ambele regine devin active',
    options: ['Da', 'Nu'],
  },
  {
    eventId: 'deactivate_queens',
    question: '🏥 Statul taie de la sănătate — ambele regine sunt blocate',
    options: ['Da', 'Nu'],
  },
  {
    eventId: 'cutremur',
    question: '🌍 Cutremur — toate turnurile primesc o bulină în plus',
    options: ['Da', 'Nu'],
  },
  {
    eventId: 'rook_back_lost',
    question: '🏰 Tura 2 înapoi — cine are sub 2 turnuri primește unul înapoi',
    options: ['Da', 'Nu'],
  },
  {
    eventId: 'imn_romaniei',
    question: '🎵 Se cântă imnul — jocul e blocat 30 de secunde',
    options: ['Da', 'Nu'],
  },
  {
    eventId: 'renovari',
    question: '🔧 Renovări — toate turnurile pierd o bulină',
    options: ['Da', 'Nu'],
  },
  {
    eventId: 'vin_fantomele',
    question: '👻 Vin fantomele — ambii regi pot fi mutați',
    options: ['Da', 'Nu'],
  },
  {
    eventId: 'mor_regii',
    question: '💀 Mor regii — ambii regi sunt blocați din nou',
    options: ['Da', 'Nu'],
  },
  {
    eventId: 'publicul_beat',
    question: '🍺 Publicul e beat — jocul se rotește 30 de secunde',
    options: ['Da', 'Nu'],
  },
];

function isEventEligible(eventId: string, room: Room): boolean {
  switch (eventId) {
    case 'renovari':
      return room.specialRooks.white.length > 0 || room.specialRooks.black.length > 0 ||
             room.doubleRedDotRooks.white.length > 0 || room.doubleRedDotRooks.black.length > 0;
    case 'cutremur':
      return true; // always eligible (0-dot rooks can't be tracked without board scan)
    case 'activate_queens':
      return room.inactiveQueens.white || room.inactiveQueens.black;
    case 'deactivate_queens':
      return !room.inactiveQueens.white || !room.inactiveQueens.black;
    case 'vin_fantomele':
      return room.inactiveKings.white || room.inactiveKings.black;
    case 'mor_regii':
      return !room.inactiveKings.white || !room.inactiveKings.black;
    default:
      return true;
  }
}

export function pickTwoRandomEvents(room: Room): [EventDefinition, EventDefinition] {
  const eligible = EVENT_DEFINITIONS.filter(def => isEventEligible(def.eventId, room));
  const pool = eligible.length >= 2 ? eligible : EVENT_DEFINITIONS;
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return [shuffled[0], shuffled[1]];
}

function getEmptySquares(chess: Chess, excludeRanks: number[] = []): string[] {
  const result: string[] = [];
  for (const f of 'abcdefgh') {
    for (let r = 1; r <= 8; r++) {
      if (excludeRanks.includes(r)) continue;
      const sq = `${f}${r}`;
      if (!chess.get(sq as Square)) result.push(sq);
    }
  }
  return result;
}

function fixFen(chess: Chess, room: Room): void {
  const parts = chess.fen().split(' ');
  parts[1] = room.chess.currentTurn;
  parts[3] = '-';
  room.chess.fen = parts.join(' ');
}

export function applyEventEffect(
  room: Room,
  eventId: string,
  winningOption: 0 | 1,
  io?: Server,
  socketRoomId?: string,
): void {
  const chess = new Chess(room.chess.fen);

  switch (eventId) {

    case 'diaspora_pawns': {
      const count = winningOption === 0 ? 2 : 4;
      const empty = getEmptySquares(chess, [1, 8]).sort(() => Math.random() - 0.5);
      const forWhite = empty.slice(0, count);
      const forBlack = empty.slice(count, count * 2);
      for (const sq of forWhite) {
        chess.put({ type: 'p', color: 'w' }, sq as Square);
        room.specialPawns.white.flag.push(sq);
      }
      for (const sq of forBlack) {
        chess.put({ type: 'p', color: 'b' }, sq as Square);
        room.specialPawns.black.flag.push(sq);
      }
      fixFen(chess, room);
      break;
    }

    case 'activate_queens': {
      room.inactiveQueens.white = false;
      room.inactiveQueens.black = false;
      room.queensEverActivated = true;
      break;
    }

    case 'deactivate_queens': {
      room.inactiveQueens.white = true;
      room.inactiveQueens.black = true;
      break;
    }

    case 'cutremur': {
      for (const ck of ['white', 'black'] as const) {
        const rookColor = ck === 'white' ? 'w' : 'b';
        for (const f of 'abcdefgh') {
          for (let r = 1; r <= 8; r++) {
            const sq = `${f}${r}`;
            const piece = chess.get(sq as Square);
            if (piece?.type !== 'r' || piece.color !== rookColor) continue;
            if (room.doubleRedDotRooks[ck].includes(sq)) {
              // already at max, no change
            } else if (room.specialRooks[ck].includes(sq)) {
              room.specialRooks[ck] = room.specialRooks[ck].filter(s => s !== sq);
              room.doubleRedDotRooks[ck].push(sq);
            } else {
              room.specialRooks[ck].push(sq);
            }
          }
        }
      }
      break;
    }

    case 'rook_back_lost': {
      for (const rookColor of ['w', 'b'] as const) {
        let rookCount = 0;
        for (const f of 'abcdefgh') {
          for (let r = 1; r <= 8; r++) {
            const p = chess.get(`${f}${r}` as Square);
            if (p?.type === 'r' && p.color === rookColor) rookCount++;
          }
        }
        if (rookCount < 2) {
          const empty = getEmptySquares(chess).sort(() => Math.random() - 0.5);
          if (empty.length > 0) {
            chess.put({ type: 'r', color: rookColor }, empty[0] as Square);
          }
        }
      }
      fixFen(chess, room);
      break;
    }

    case 'imn_romaniei': {
      room.imnActive = true;
      if (room.imnTimeout) clearTimeout(room.imnTimeout);
      if (io && socketRoomId) {
        io.to(socketRoomId).emit('room:boardUpdate', getBoardUpdate(room));
        room.imnTimeout = setTimeout(() => {
          room.imnActive = false;
          room.imnTimeout = null;
          io.to(socketRoomId).emit('room:boardUpdate', getBoardUpdate(room));
        }, 30000);
      }
      break;
    }

    case 'renovari': {
      for (const ck of ['white', 'black'] as const) {
        // 2 dots → 1 dot, 1 dot → 0 dots
        const promoted = [...room.doubleRedDotRooks[ck]];
        room.specialRooks[ck] = promoted;
        room.doubleRedDotRooks[ck] = [];
      }
      break;
    }

    case 'vin_fantomele': {
      room.inactiveKings.white = false;
      room.inactiveKings.black = false;
      break;
    }

    case 'mor_regii': {
      room.inactiveKings.white = true;
      room.inactiveKings.black = true;
      break;
    }

    case 'publicul_beat': {
      room.boardRotated = true;
      if (room.boardRotatedTimeout) clearTimeout(room.boardRotatedTimeout);
      if (io && socketRoomId) {
        io.to(socketRoomId).emit('room:boardUpdate', getBoardUpdate(room));
        room.boardRotatedTimeout = setTimeout(() => {
          room.boardRotated = false;
          room.boardRotatedTimeout = null;
          io.to(socketRoomId).emit('room:boardUpdate', getBoardUpdate(room));
        }, 30000);
      }
      break;
    }

    default:
      console.log(`[event] "${eventId}" → opțiunea ${winningOption} (efect neimplementat)`);
  }
}

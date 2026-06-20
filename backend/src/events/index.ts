import { Room } from '../models/room';

export interface EventDefinition {
  eventId: string;
  question: string;
  options: [string, string];
}

// Lista de evenimente disponibile — adaugă/modifică după nevoie
export const EVENT_DEFINITIONS: EventDefinition[] = [
  {
    eventId: 'double_move',
    question: 'Cine joacă de două ori la rând?',
    options: ['Albul', 'Negrul'],
  },
  {
    eventId: 'remove_pawn',
    question: 'Un pion dispare de pe tablă!',
    options: ['Un pion alb', 'Un pion negru'],
  },
  {
    eventId: 'extra_queen',
    question: 'Cine primește o damă în plus?',
    options: ['Albul', 'Negrul'],
  },
  {
    eventId: 'frozen_piece',
    question: 'O piesă îngheață pentru un tur!',
    options: ['O piesă albă', 'O piesă neagră'],
  },
  {
    eventId: 'swap_pawns',
    question: 'Ce se întâmplă cu pionii?',
    options: ['Pionii albi avansează un rând', 'Pionii negri avansează un rând'],
  },
];

export function pickRandomEvent(): EventDefinition {
  return EVENT_DEFINITIONS[Math.floor(Math.random() * EVENT_DEFINITIONS.length)];
}

/**
 * Aplică efectul câștigător al unui eveniment asupra stării jocului.
 *
 * TODO: implementează efectele concrete pentru fiecare eventId.
 * Funcția primește room-ul complet (inclusiv room.chess.fen) și poate
 * modifica orice proprietate a stării de joc.
 *
 * Pattern de extensie:
 *   switch (eventId) {
 *     case 'double_move':
 *       // opțiunea 0 = albul joacă de două ori, 1 = negrul
 *       // TODO: setează un flag pe room (ex. room.extraMove = winningOption)
 *       // și tratează-l în sockets/room.ts la room:move
 *       break;
 *
 *     case 'extra_queen':
 *       // TODO: parsează FEN-ul, adaugă Q/q în poziție liberă, actualizează room.chess.fen
 *       break;
 *
 *     case 'remove_pawn':
 *       // TODO: găsește primul pion al culorii câștigătoare din FEN și elimină-l
 *       break;
 *   }
 */
export function applyEventEffect(
  room: Room,
  eventId: string,
  winningOption: 0 | 1,
): void {
  // TODO: implementează efectele aici
  console.log(`[event] "${eventId}" → opțiunea ${winningOption} câștigă (efect neimplementat)`);
}

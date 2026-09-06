import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Chess, Square } from 'chess.js';
import { Subscription } from 'rxjs';
import { RoomService } from '../../services/room.service';
import { BoardUpdate, EventResult, EventStart, PlayerColor } from '../../models/room.model';

interface BoardSquare {
  square: Square;
  piece: string | null;
  isLight: boolean;
  isSelected: boolean;
  isValidMove: boolean;
  rankLabel: string | null;
  fileLabel: string | null;
  specialPawn: 'flag' | 'hair' | null;
  hasRedDot: boolean;
  hasDoubleRedDot: boolean;
  isInactiveKing: boolean;
  isInactiveQueen: boolean;
}

@Component({
  selector: 'app-player',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './player.html',
  styleUrl: './player.scss',
})
export class PlayerComponent implements OnInit, OnDestroy {
  roomId = '';
  token = '';
  color: PlayerColor = 'white';

  chess = new Chess();
  board: BoardSquare[][] = [];
  selectedSquare: Square | null = null;
  bishopKnightMode = false;

  boardState: BoardUpdate | null = null;
  statusMessage = 'Conectare…';

  activeEvent: EventStart | null = null;
  eventResult: EventResult | null = null;
  boardRotated = false;

  private sub = new Subscription();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private roomService: RoomService,
  ) {}

  ngOnInit(): void {
    this.roomId = this.route.snapshot.paramMap.get('roomId') ?? '';
    this.token = this.route.snapshot.queryParamMap.get('token') ?? '';

    this.roomService.joinAsPlayer(this.roomId, this.token);

    this.sub.add(
      this.roomService.onRoomState().subscribe((state) => {
        this.color = state.color ?? 'white';
        this.applyBoardUpdate(state.board);
        this.activeEvent = state.activeEvent;
      }),
    );

    this.sub.add(
      this.roomService.onBoardUpdate().subscribe((update) => {
        this.applyBoardUpdate(update);
      }),
    );

    this.sub.add(
      this.roomService.onEventStart().subscribe((event) => {
        this.activeEvent = event;
        this.eventResult = null;
      }),
    );

    this.sub.add(
      this.roomService.onEventResult().subscribe((result) => {
        this.eventResult = result;
        this.activeEvent = null;
        setTimeout(() => (this.eventResult = null), 5000);
      }),
    );

    this.sub.add(
      this.roomService.onError().subscribe((err) => {
        this.statusMessage = err.message;
      }),
    );
  }

  private applyBoardUpdate(update: BoardUpdate): void {
    this.boardState = update;
    this.chess.load(update.fen);
    this.renderBoard();
    this.updateStatus();
  }

  renderBoard(): void {
    const data = this.chess.board();
    const ranks = this.color === 'black' ? [...data].reverse() : data;
    this.board = ranks.map((rank, ri) => {
      const files = this.color === 'black' ? [...rank].reverse() : rank;
      return files.map((cell, fi) => {
        const rankIdx = this.color === 'black' ? ri : 7 - ri;
        const fileIdx = this.color === 'black' ? 7 - fi : fi;
        const square = (String.fromCharCode(97 + fileIdx) + (rankIdx + 1)) as Square;
        const pieceCode = cell ? `${cell.color}${cell.type}` : null;
        return {
          square,
          piece: pieceCode,
          isLight: (ri + fi) % 2 === 0,
          isSelected: false,
          isValidMove: false,
          rankLabel: fi === 0 ? square[1] : null,
          fileLabel: ri === ranks.length - 1 ? square[0] : null,
          specialPawn: this.getSpecialPawn(square, pieceCode),
          hasRedDot: this.getHasRedDot(square, pieceCode),
          hasDoubleRedDot: this.getHasDoubleRedDot(square, pieceCode),
          isInactiveKing: this.getIsInactiveKing(pieceCode),
          isInactiveQueen: this.getIsInactiveQueen(pieceCode),
        };
      });
    });
  }

  onSquareClick(sq: BoardSquare): void {
    const ownColor = this.color === 'white' ? 'w' : 'b';
    const myTurn = this.boardState?.status === 'active' && this.chess.turn() === ownColor;

    // Block all interaction during vote or anthem
    if (this.activeEvent || this.boardState?.imnActive) return;

    // Inactive king/queen: block selection entirely
    if ((sq.isInactiveKing || sq.isInactiveQueen) && sq.piece?.[0] === ownColor) return;

    // Flag pawn: clicking it immediately teleports to a random square
    if (sq.piece?.[0] === ownColor && sq.specialPawn === 'flag' && myTurn) {
      this.roomService.teleportFlagPawn(this.roomId, this.token, sq.square);
      this.selectedSquare = null;
      this.clearHighlights();
      return;
    }

    if (this.selectedSquare) {
      if (sq.piece && sq.piece[0] === ownColor) {
        this.selectedSquare = sq.square;
        this.highlightMoves(sq.square);
      } else if (myTurn) {
        this.roomService.makeMove(
          this.roomId,
          this.token,
          `${this.selectedSquare}${sq.square}`,
        );
        this.selectedSquare = null;
        this.clearHighlights();
      } else {
        this.selectedSquare = null;
        this.clearHighlights();
      }
    } else if (sq.piece && sq.piece[0] === ownColor) {
      this.selectedSquare = sq.square;
      this.highlightMoves(sq.square);
    }
  }

  private getSpecialPawn(square: Square, pieceCode: string | null): 'flag' | 'hair' | null {
    if (!pieceCode || pieceCode[1] !== 'p') return null;
    const sp = this.boardState?.specialPawns;
    if (!sp) return null;
    const list = pieceCode[0] === 'w' ? sp.white : sp.black;
    if (list.flag.includes(square)) return 'flag';
    if (list.hair.includes(square)) return 'hair';
    return null;
  }

  private getHasRedDot(square: Square, pieceCode: string | null): boolean {
    if (!pieceCode || pieceCode[1] !== 'r') return false;
    const sr = this.boardState?.specialRooks;
    if (!sr) return false;
    return (pieceCode[0] === 'w' ? sr.white : sr.black).includes(square);
  }

  private getHasDoubleRedDot(square: Square, pieceCode: string | null): boolean {
    if (!pieceCode || pieceCode[1] !== 'r') return false;
    const dr = this.boardState?.doubleRedDotRooks;
    if (!dr) return false;
    return (pieceCode[0] === 'w' ? dr.white : dr.black).includes(square);
  }

  private getIsInactiveKing(pieceCode: string | null): boolean {
    if (!pieceCode || pieceCode[1] !== 'k') return false;
    const ik = this.boardState?.inactiveKings;
    if (!ik) return false;
    return pieceCode[0] === 'w' ? ik.white : ik.black;
  }

  private getIsInactiveQueen(pieceCode: string | null): boolean {
    if (!pieceCode || pieceCode[1] !== 'q') return false;
    const iq = this.boardState?.inactiveQueens;
    if (!iq) return false;
    return pieceCode[0] === 'w' ? iq.white : iq.black;
  }

  highlightMoves(from: Square): void {
    const piece = this.chess.get(from);
    this.bishopKnightMode = false;

    // Bishop: 30% chance to show knight moves instead
    if (piece?.type === 'b' && Math.random() < 0.3) {
      this.bishopKnightMode = true;
      const knightOffsets = [[1,2],[1,-2],[-1,2],[-1,-2],[2,1],[2,-1],[-2,1],[-2,-1]];
      const fromFile = from.charCodeAt(0) - 97;
      const fromRank = parseInt(from[1]) - 1;
      const targets = new Set<Square>();
      for (const [df, dr] of knightOffsets) {
        const tf = fromFile + df;
        const tr = fromRank + dr;
        if (tf >= 0 && tf < 8 && tr >= 0 && tr < 8) {
          const sq = (String.fromCharCode(97 + tf) + (tr + 1)) as Square;
          const p = this.chess.get(sq);
          if (!p || p.color !== piece.color) targets.add(sq);
        }
      }
      this.board = this.board.map(rank => rank.map(sq => ({
        ...sq, isSelected: sq.square === from, isValidMove: targets.has(sq.square),
      })));
      return;
    }

    let moves = this.chess.moves({ square: from, verbose: true });

    // Rook movement limits (1 dot = max 4, 2 dots = max 1)
    if (piece?.type === 'r') {
      const sr = this.boardState?.specialRooks;
      const dr = this.boardState?.doubleRedDotRooks;
      if (sr && dr) {
        const dlist = piece.color === 'w' ? dr.white : dr.black;
        const slist = piece.color === 'w' ? sr.white : sr.black;
        const maxDist = dlist.includes(from) ? 1 : slist.includes(from) ? 4 : 99;
        if (maxDist < 99) {
          moves = moves.filter(m => {
            const dist = Math.max(
              Math.abs(m.to.charCodeAt(0) - from.charCodeAt(0)),
              Math.abs(parseInt(m.to[1]) - parseInt(from[1])),
            );
            return dist <= maxDist;
          });
        }
      }
    }

    const targets = new Set(moves.map((m) => m.to));
    this.board = this.board.map((rank) =>
      rank.map((sq) => ({
        ...sq,
        isSelected: sq.square === from,
        isValidMove: targets.has(sq.square),
      })),
    );
  }

  clearHighlights(): void {
    this.bishopKnightMode = false;
    this.board = this.board.map((rank) =>
      rank.map((sq) => ({ ...sq, isSelected: false, isValidMove: false })),
    );
  }

  updateStatus(): void {
    const s = this.boardState;
    if (!s) return;
    if (this.activeEvent) {
      this.statusMessage = '🗳️ Votul publicului — mutările sunt blocate!';
      return;
    }
    if (s.imnActive) {
      this.statusMessage = '🎵 Se cântă imnul — mutările sunt blocate!';
      return;
    }
    if (s.status === 'waiting') {
      this.statusMessage = s.players.white && !s.players.black
        ? 'Așteptăm jucătorul 2…'
        : 'Așteptăm jucătorii…';
      return;
    }
    if (s.status === 'finished') {
      this.statusMessage =
        s.winner === 'draw'
          ? 'Remiză!'
          : `${s.winner === 'white' ? 'Albul' : 'Negrul'} câștigă!`;
      return;
    }
    const myTurn = (s.currentTurn === 'w') === (this.color === 'white');
    this.statusMessage = myTurn ? 'Rândul tău' : 'Rândul adversarului';
  }

  hostPick(choice: 0 | 1): void {
    this.roomService.hostPick(this.roomId, this.token, choice);
  }

  newGame(): void {
    this.router.navigate(['/host']);
  }

  pieceSymbol(code: string | null): string {
    if (!code) return '';
    const map: Record<string, string> = {
      wp: '♙︎', wr: '♖︎', wn: '♘︎', wb: '♗︎', wq: '♕︎', wk: '♔︎',
      bp: '♟︎', br: '♜︎', bn: '♞︎', bb: '♝︎', bq: '♛︎', bk: '♚︎',
    };
    return map[code] ?? '';
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
  }
}

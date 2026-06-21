import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
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

  boardState: BoardUpdate | null = null;
  statusMessage = 'Conectare…';

  activeEvent: EventStart | null = null;
  eventResult: EventResult | null = null;

  private sub = new Subscription();

  constructor(
    private route: ActivatedRoute,
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
      this.roomService.onEventTick().subscribe((tick) => {
        if (this.activeEvent) {
          this.activeEvent = { ...this.activeEvent, secondsLeft: tick.secondsLeft };
        }
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
        };
      });
    });
  }

  onSquareClick(sq: BoardSquare): void {
    const ownColor = this.color === 'white' ? 'w' : 'b';
    const myTurn = this.boardState?.status === 'active' && this.chess.turn() === ownColor;

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

  highlightMoves(from: Square): void {
    const moves = this.chess.moves({ square: from, verbose: true });
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
    this.board = this.board.map((rank) =>
      rank.map((sq) => ({ ...sq, isSelected: false, isValidMove: false })),
    );
  }

  updateStatus(): void {
    const s = this.boardState;
    if (!s) return;
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

  pieceSymbol(code: string | null): string {
    if (!code) return '';
    const map: Record<string, string> = {
      wp: '♟', wr: '♜', wn: '♞', wb: '♝', wq: '♛', wk: '♚',
      bp: '♟', br: '♜', bn: '♞', bb: '♝', bq: '♛', bk: '♚',
    };
    return map[code] ?? '';
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
  }
}

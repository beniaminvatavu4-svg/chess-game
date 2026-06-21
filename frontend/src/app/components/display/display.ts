import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { Chess, Square } from 'chess.js';
import { Subscription } from 'rxjs';
import { RoomService } from '../../services/room.service';
import { BoardUpdate, EventResult, EventStart } from '../../models/room.model';

interface BoardSquare {
  square: Square;
  piece: string | null;
  isLight: boolean;
  isLastMove: boolean;
  rankLabel: string | null;
  fileLabel: string | null;
  specialPawn: 'flag' | 'hair' | null;
}

@Component({
  selector: 'app-display',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './display.html',
  styleUrl: './display.scss',
})
export class DisplayComponent implements OnInit, OnDestroy {
  roomId = '';
  chess = new Chess();
  board: BoardSquare[][] = [];

  boardState: BoardUpdate | null = null;
  statusMessage = 'Conectare…';

  qrAudience = '';

  activeEvent: EventStart | null = null;
  eventResult: EventResult | null = null;

  private sub = new Subscription();

  constructor(
    private route: ActivatedRoute,
    private roomService: RoomService,
  ) {}

  ngOnInit(): void {
    this.roomId = this.route.snapshot.paramMap.get('roomId') ?? '';
    this.roomService.joinAsSpectator(this.roomId);

    this.sub.add(
      this.roomService.onRoomState().subscribe((state) => {
        this.qrAudience = state.qrAudience ?? '';
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
        setTimeout(() => (this.eventResult = null), 6000);
      }),
    );
  }

  private applyBoardUpdate(update: BoardUpdate): void {
    this.boardState = update;
    this.chess.load(update.fen);
    this.renderBoard(update.lastMove);
    this.updateStatus();
  }

  renderBoard(lastMove: string | null): void {
    const lastFrom = lastMove?.slice(0, 2);
    const lastTo = lastMove?.slice(2, 4);
    const data = this.chess.board();
    this.board = data.map((rank, ri) =>
      rank.map((cell, fi) => {
        const rankIdx = 7 - ri;
        const fileIdx = fi;
        const square = (String.fromCharCode(97 + fileIdx) + (rankIdx + 1)) as Square;
        const pieceCode = cell ? `${cell.color}${cell.type}` : null;
        return {
          square,
          piece: pieceCode,
          isLight: (ri + fi) % 2 === 0,
          isLastMove: square === lastFrom || square === lastTo,
          rankLabel: fi === 0 ? square[1] : null,
          fileLabel: ri === 7 ? square[0] : null,
          specialPawn: this.getSpecialPawn(square, pieceCode),
        };
      }),
    );
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

  updateStatus(): void {
    const s = this.boardState;
    if (!s) return;
    if (s.status === 'waiting') { this.statusMessage = 'Așteptăm jucătorii…'; return; }
    if (s.status === 'finished') {
      this.statusMessage =
        s.winner === 'draw' ? 'Remiză!' : `${s.winner === 'white' ? 'Albul' : 'Negrul'} câștigă!`;
      return;
    }
    this.statusMessage = s.currentTurn === 'w' ? '♔ Rândul Albului' : '♚ Rândul Negrului';
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

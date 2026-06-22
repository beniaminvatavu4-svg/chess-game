import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { Chess, Square } from 'chess.js';
import { Subscription } from 'rxjs';
import { RoomService } from '../../services/room.service';
import { BoardUpdate, EventResult, EventStart } from '../../models/room.model';

const LATEST_POLL_MS = 5000;

interface BoardSquare {
  square: Square;
  piece: string | null;
  isLight: boolean;
  isLastMove: boolean;
  rankLabel: string | null;
  fileLabel: string | null;
  specialPawn: 'flag' | 'hair' | null;
  hasRedDot: boolean;
  hasDoubleRedDot: boolean;
  isInactiveKing: boolean;
  isInactiveQueen: boolean;
}

@Component({
  selector: 'app-display',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './display.html',
  styleUrl: './display.scss',
})
export class DisplayComponent implements OnInit, OnDestroy {
  private readonly bishopSounds = [
    '/sounds/11900601.mp3',
    '/sounds/censor-beep-1.mp3',
    '/sounds/dry-fart.mp3',
    '/sounds/error_CDOxCYm.mp3',
    '/sounds/oh-my-god-bro-oh-hell-nah-man.mp3',
    '/sounds/pana-aici-diana-sosoaca.mp3',
    '/sounds/protestr.mp3',
    '/sounds/serghei.mp3',
  ];

  roomId = '';
  chess = new Chess();
  board: BoardSquare[][] = [];

  boardState: BoardUpdate | null = null;
  statusMessage = 'Conectare…';
  audioEnabled = false;
  boardRotated = false;
  private unlockHandler = () => this.enableAudio();

  qrAudience = '';

  activeEvent: EventStart | null = null;
  eventResult: EventResult | null = null;

  private sub = new Subscription();
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private autoMode = false;
  private wasImnActive = false;

  constructor(
    private route: ActivatedRoute,
    private roomService: RoomService,
  ) {}

  ngOnInit(): void {
    document.addEventListener('click', this.unlockHandler, { once: true });
    document.addEventListener('keydown', this.unlockHandler, { once: true });
    document.addEventListener('touchstart', this.unlockHandler, { once: true });

    const paramRoomId = this.route.snapshot.paramMap.get('roomId') ?? '';
    if (paramRoomId) {
      this.roomId = paramRoomId;
      this.roomService.joinAsSpectator(this.roomId);
    } else {
      this.autoMode = true;
      this.connectToLatest();
      this.pollTimer = setInterval(() => this.connectToLatest(), LATEST_POLL_MS);
    }

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
    if (update.lastMove && this.boardState) {
      const prevChess = new Chess(this.boardState.fen);
      const from = update.lastMove.slice(0, 2) as Square;
      const piece = prevChess.get(from);
      if (piece?.type === 'b') this.playBishopSound();
    }
    if (update.imnActive && !this.wasImnActive) this.playAnthem();
    this.wasImnActive = update.imnActive;
    this.boardState = update;
    this.chess.load(update.fen);
    this.renderBoard(update.lastMove);
    this.updateStatus();
  }

  enableAudio(): void {
    const silent = new Audio(this.bishopSounds[0]);
    silent.volume = 0;
    silent.play().then(() => { silent.pause(); this.audioEnabled = true; }).catch(() => { this.audioEnabled = true; });
  }

  private playAnthem(): void {
    if (!this.audioEnabled) return;
    const audio = new Audio('/sounds/imn.mp3');
    audio.play().catch(() => {});
    setTimeout(() => { audio.pause(); audio.currentTime = 0; }, 30000);
  }

  private playBishopSound(): void {
    if (!this.audioEnabled) return;
    const src = this.bishopSounds[Math.floor(Math.random() * this.bishopSounds.length)];
    const audio = new Audio(src);
    audio.play().catch(() => {});
    setTimeout(() => { audio.pause(); audio.currentTime = 0; }, 2000);
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
          hasRedDot: this.getHasRedDot(square, pieceCode),
          hasDoubleRedDot: this.getHasDoubleRedDot(square, pieceCode),
          isInactiveKing: this.getIsInactiveKing(pieceCode),
          isInactiveQueen: this.getIsInactiveQueen(pieceCode),
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

  private connectToLatest(): void {
    this.roomService.getLatestRoom().subscribe({
      next: ({ roomId }) => {
        if (roomId === this.roomId) return;
        if (this.roomId) this.roomService.leaveRoom(this.roomId);
        this.roomId = roomId;
        this.boardState = null;
        this.board = [];
        this.activeEvent = null;
        this.eventResult = null;
        this.statusMessage = 'Conectare…';
        this.roomService.joinAsSpectator(roomId);
      },
      error: () => {
        if (!this.roomId) this.statusMessage = 'Niciun meci activ…';
      },
    });
  }

  ngOnDestroy(): void {
    document.removeEventListener('click', this.unlockHandler);
    document.removeEventListener('keydown', this.unlockHandler);
    document.removeEventListener('touchstart', this.unlockHandler);
    if (this.pollTimer) clearInterval(this.pollTimer);
    this.sub.unsubscribe();
  }
}

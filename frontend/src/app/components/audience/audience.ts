import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { RoomService } from '../../services/room.service';
import { BoardUpdate, EventResult, EventStart } from '../../models/room.model';

@Component({
  selector: 'app-audience',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './audience.html',
  styleUrl: './audience.scss',
})
export class AudienceComponent implements OnInit, OnDestroy {
  roomId = '';
  deviceId = '';

  boardState: BoardUpdate | null = null;
  activeEvent: EventStart | null = null;
  eventResult: EventResult | null = null;

  hasVoted = false;
  votedOption: 0 | 1 | null = null;

  private sub = new Subscription();

  constructor(
    private route: ActivatedRoute,
    private roomService: RoomService,
  ) {}

  ngOnInit(): void {
    this.roomId = this.route.snapshot.paramMap.get('roomId') ?? '';
    this.deviceId = this.getOrCreateDeviceId();

    this.roomService.joinAsAudience(this.roomId);

    this.sub.add(
      this.roomService.onRoomState().subscribe((state) => {
        this.boardState = state.board;
        this.activeEvent = state.activeEvent;
      }),
    );

    this.sub.add(
      this.roomService.onBoardUpdate().subscribe((update) => {
        this.boardState = update;
      }),
    );

    this.sub.add(
      this.roomService.onEventStart().subscribe((event) => {
        this.activeEvent = event;
        this.eventResult = null;
        this.hasVoted = false;
        this.votedOption = null;
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

  vote(option: 0 | 1): void {
    if (this.hasVoted || !this.activeEvent) return;
    this.hasVoted = true;
    this.votedOption = option;
    this.roomService.vote(this.roomId, this.deviceId, option);
  }

  private getOrCreateDeviceId(): string {
    const key = 'chess_live_device_id';
    let id = localStorage.getItem(key);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(key, id);
    }
    return id;
  }

  get gameStatusText(): string {
    const s = this.boardState;
    if (!s) return 'Conectare…';
    if (s.status === 'waiting') return 'Meciul începe în curând…';
    if (s.status === 'finished') {
      return s.winner === 'draw'
        ? 'Remiză!'
        : `${s.winner === 'white' ? 'Albul' : 'Negrul'} câștigă!`;
    }
    return s.currentTurn === 'w' ? '♔ Rândul Albului' : '♚ Rândul Negrului';
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
  }
}

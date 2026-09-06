import { Injectable, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { io, Socket } from 'socket.io-client';
import {
  BoardUpdate,
  CreateRoomResponse,
  EventResult,
  EventStart,
  RoomState,
} from '../models/room.model';

@Injectable({ providedIn: 'root' })
export class RoomService implements OnDestroy {
  private socket: Socket;
  private readonly base = '/api';

  constructor(private http: HttpClient) {
    const url =
      window.location.hostname === 'localhost'
        ? 'http://localhost:3000'
        : window.location.origin;
    this.socket = io(url, { transports: ['websocket'] });
  }

  // ─── REST ──────────────────────────────────────────────────────────────────

  createRoom(): Observable<CreateRoomResponse> {
    return this.http.post<CreateRoomResponse>(`${this.base}/rooms`, {});
  }

  // ─── Emit ──────────────────────────────────────────────────────────────────

  joinAsPlayer(roomId: string, token: string): void {
    this.socket.emit('room:join', { roomId, role: 'player', token });
  }

  joinAsSpectator(roomId: string): void {
    this.socket.emit('room:join', { roomId, role: 'spectator' });
  }

  leaveRoom(roomId: string): void {
    this.socket.emit('room:leave', { roomId });
  }

  getLatestRoom(): Observable<{ roomId: string }> {
    return this.http.get<{ roomId: string }>(`${this.base}/rooms/latest`);
  }

  getLatestJoinBlack(): Observable<{ roomId: string; tokenBlack: string }> {
    return this.http.get<{ roomId: string; tokenBlack: string }>(`${this.base}/rooms/latest/join-black`);
  }

  getRoomJoinBlack(roomId: string): Observable<{ roomId: string; tokenBlack: string }> {
    return this.http.get<{ roomId: string; tokenBlack: string }>(`${this.base}/rooms/${roomId}/join-black`);
  }

  joinAsAudience(roomId: string): void {
    this.socket.emit('room:join', { roomId, role: 'audience' });
  }

  makeMove(roomId: string, token: string, move: string): void {
    this.socket.emit('room:move', { roomId, token, move });
  }

  teleportFlagPawn(roomId: string, token: string, from: string): void {
    this.socket.emit('room:teleport-flag-pawn', { roomId, token, from });
  }

  hostPick(roomId: string, token: string, choice: 0 | 1): void {
    this.socket.emit('room:host-pick', { roomId, token, choice });
  }

  anthemEnded(roomId: string): void {
    this.socket.emit('room:anthem-ended', { roomId });
  }

  // ─── Listen ────────────────────────────────────────────────────────────────

  onRoomState(): Observable<RoomState> {
    return new Observable((obs) => {
      this.socket.on('room:state', (d: RoomState) => obs.next(d));
      return () => this.socket.off('room:state');
    });
  }

  onBoardUpdate(): Observable<BoardUpdate> {
    return new Observable((obs) => {
      this.socket.on('room:boardUpdate', (d: BoardUpdate) => obs.next(d));
      return () => this.socket.off('room:boardUpdate');
    });
  }

  onEventStart(): Observable<EventStart> {
    return new Observable((obs) => {
      this.socket.on('room:event:start', (d: EventStart) => obs.next(d));
      return () => this.socket.off('room:event:start');
    });
  }

  onEventResult(): Observable<EventResult> {
    return new Observable((obs) => {
      this.socket.on('room:event:result', (d: EventResult) => obs.next(d));
      return () => this.socket.off('room:event:result');
    });
  }

  onError(): Observable<{ message: string }> {
    return new Observable((obs) => {
      this.socket.on('room:error', (d: { message: string }) => obs.next(d));
      return () => this.socket.off('room:error');
    });
  }

  ngOnDestroy(): void {
    this.socket.disconnect();
  }
}

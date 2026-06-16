import { Injectable, OnDestroy } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { Observable } from 'rxjs';
import { Game } from '../models/game.model';

@Injectable({ providedIn: 'root' })
export class SocketService implements OnDestroy {
  private socket: Socket;

  constructor() {
    const url = window.location.hostname === 'localhost'
      ? 'http://localhost:3000'
      : window.location.origin;
    this.socket = io(url);
  }

  joinGame(gameId: string, color: 'white' | 'black'): void {
    this.socket.emit('join-game', { gameId, color });
  }

  makeMove(gameId: string, move: string): void {
    this.socket.emit('make-move', { gameId, move });
  }

  onGameUpdate(): Observable<Game> {
    return new Observable((observer) => {
      this.socket.on('game-update', (game: Game) => observer.next(game));
      return () => this.socket.off('game-update');
    });
  }

  onInvalidMove(): Observable<{ move: string }> {
    return new Observable((observer) => {
      this.socket.on('invalid-move', (data: { move: string }) => observer.next(data));
      return () => this.socket.off('invalid-move');
    });
  }

  ngOnDestroy(): void {
    this.socket.disconnect();
  }
}

import { Injectable, OnDestroy } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { Observable } from 'rxjs';
import { Game } from '../models/game.model';

@Injectable({ providedIn: 'root' })
export class SocketService implements OnDestroy {
  private socket: Socket;

  constructor() {
    const isLocal = window.location.hostname === 'localhost';
    const url = isLocal ? 'http://localhost:3000' : window.location.origin;
    // In prod, Nginx only routes /chess/* to this backend and strips the
    // /chess prefix before forwarding — so the client must request
    // /chess/socket.io (to match Nginx's location block) while the
    // server itself stays on the Engine.IO default /socket.io (what it
    // actually receives post-strip). Local dev has no such proxy prefix.
    // The server only allows the websocket transport, so the client
    // must too — otherwise its default polling-first handshake gets
    // rejected.
    const path = isLocal ? '/socket.io' : '/chess/socket.io';
    this.socket = io(url, { transports: ['websocket'], path });
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

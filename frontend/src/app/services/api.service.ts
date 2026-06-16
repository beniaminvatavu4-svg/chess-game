import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Game } from '../models/game.model';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly base = '/api';

  constructor(private http: HttpClient) {}

  createGame(): Observable<Game> {
    return this.http.post<Game>(`${this.base}/games`, {});
  }

  getGames(): Observable<Game[]> {
    return this.http.get<Game[]>(`${this.base}/games`);
  }

  getGame(id: string): Observable<Game> {
    return this.http.get<Game>(`${this.base}/games/${id}`);
  }
}

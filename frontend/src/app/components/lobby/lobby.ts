import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { Game } from '../../models/game.model';

@Component({
  selector: 'app-lobby',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './lobby.html',
  styleUrl: './lobby.scss',
})
export class LobbyComponent implements OnInit {
  games: Game[] = [];

  constructor(private api: ApiService, private router: Router) {}

  ngOnInit(): void {
    this.loadGames();
  }

  loadGames(): void {
    this.api.getGames().subscribe((games) => (this.games = games));
  }

  createGame(): void {
    this.api.createGame().subscribe((game) => {
      this.router.navigate(['/game', game.id], { queryParams: { color: 'white' } });
    });
  }

  joinGame(gameId: string): void {
    this.router.navigate(['/game', gameId], { queryParams: { color: 'black' } });
  }
}

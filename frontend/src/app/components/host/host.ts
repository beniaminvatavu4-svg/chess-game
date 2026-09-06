import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { RoomService } from '../../services/room.service';
import { CreateRoomResponse } from '../../models/room.model';

@Component({
  selector: 'app-host',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './host.html',
  styleUrl: './host.scss',
})
export class HostComponent {
  room: CreateRoomResponse | null = null;
  loading = false;
  error = '';
  joinCopied = false;
  watchCopied = false;

  constructor(
    private roomService: RoomService,
    private router: Router,
  ) {}

  createRoom(): void {
    this.loading = true;
    this.error = '';
    this.roomService.createRoom().subscribe({
      next: (room) => {
        this.room = room;
        this.loading = false;
      },
      error: () => {
        this.error = 'Eroare la crearea meciului. Încearcă din nou.';
        this.loading = false;
      },
    });
  }

  goToPlay(): void {
    if (!this.room) return;
    this.router.navigate(['/play', this.room.roomId], {
      queryParams: { token: this.room.tokenWhite },
    });
  }

  get joinUrl(): string {
    if (!this.room) return '';
    return `${window.location.origin}/join/${this.room.roomId}`;
  }

  get watchUrl(): string {
    return `${window.location.origin}/watch`;
  }

  copyJoinUrl(): void {
    navigator.clipboard.writeText(this.joinUrl);
    this.joinCopied = true;
    setTimeout(() => (this.joinCopied = false), 2000);
  }

  copyWatchUrl(): void {
    navigator.clipboard.writeText(this.watchUrl);
    this.watchCopied = true;
    setTimeout(() => (this.watchCopied = false), 2000);
  }
}

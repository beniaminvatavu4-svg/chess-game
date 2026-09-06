import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { RoomService } from '../../services/room.service';

@Component({
  selector: 'app-join',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div style="display:flex;align-items:center;justify-content:center;min-height:100vh;background:#0d0d1a;color:#eee;font-family:sans-serif;font-size:1.2rem;">
      {{ message }}
    </div>
  `,
})
export class JoinComponent implements OnInit {
  message = 'Se conectează…';

  constructor(private route: ActivatedRoute, private roomService: RoomService, private router: Router) {}

  ngOnInit(): void {
    const roomId = this.route.snapshot.paramMap.get('roomId');
    const request$ = roomId
      ? this.roomService.getRoomJoinBlack(roomId)
      : this.roomService.getLatestJoinBlack();

    request$.subscribe({
      next: ({ roomId: rid, tokenBlack }) => {
        this.router.navigate(['/play', rid], { queryParams: { token: tokenBlack } });
      },
      error: () => {
        this.message = 'Niciun meci activ momentan. Încearcă mai târziu.';
      },
    });
  }
}

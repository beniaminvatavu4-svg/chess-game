import { Routes } from '@angular/router';
import { LobbyComponent } from './components/lobby/lobby';
import { BoardComponent } from './components/board/board';
import { HostComponent } from './components/host/host';
import { PlayerComponent } from './components/player/player';
import { DisplayComponent } from './components/display/display';
import { AudienceComponent } from './components/audience/audience';

export const routes: Routes = [
  // ─── Existing routes (unchanged) ─────────────────────────────────────────
  { path: '', component: LobbyComponent },
  { path: 'game/:id', component: BoardComponent },

  // ─── Live event room routes ───────────────────────────────────────────────
  { path: 'host', component: HostComponent },
  { path: 'play/:roomId', component: PlayerComponent },
  { path: 'spectate', component: DisplayComponent },
  { path: 'spectate/:roomId', component: DisplayComponent },
  { path: 'audience/:roomId', component: AudienceComponent },

  { path: '**', redirectTo: '' },
];

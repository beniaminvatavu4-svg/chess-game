import { Routes } from '@angular/router';
import { LobbyComponent } from './components/lobby/lobby';
import { BoardComponent } from './components/board/board';
import { HostComponent } from './components/host/host';
import { PlayerComponent } from './components/player/player';
import { DisplayComponent } from './components/display/display';
import { AudienceComponent } from './components/audience/audience';
import { JoinComponent } from './components/join/join';

export const routes: Routes = [
  { path: '', component: LobbyComponent },
  { path: 'game/:id', component: BoardComponent },
  { path: 'host', component: HostComponent },
  { path: 'play/:roomId', component: PlayerComponent },
  { path: 'join', component: JoinComponent },
  { path: 'join/:roomId', component: JoinComponent },
  { path: 'watch', component: DisplayComponent },
  { path: 'spectate', component: DisplayComponent },
  { path: 'spectate/:roomId', component: DisplayComponent },
  { path: 'audience/:roomId', component: AudienceComponent },
  { path: '**', redirectTo: '' },
];

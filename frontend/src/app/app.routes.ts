import { Routes } from '@angular/router';
import { LobbyComponent } from './components/lobby/lobby';
import { BoardComponent } from './components/board/board';

export const routes: Routes = [
  { path: '', component: LobbyComponent },
  { path: 'game/:id', component: BoardComponent },
  { path: '**', redirectTo: '' },
];

import { Routes } from '@angular/router';
import { SettingsComponent, NotFound, ListComponent, PlayerComponent } from './ui';
import { SignIn } from '../auth/signIn.component';
import { AuthGuard } from './auth.guard';
export const routes: Routes = [
  {
    path: 'auth',
    component: SignIn
  },
  {
    path: 'list',
    component: ListComponent,
    canMatch: [AuthGuard]
  },
  {
    path: 'list/:pageIndex',
    component: ListComponent,
    canMatch: [AuthGuard]
  },
  {
    path: 'player',
    component: PlayerComponent,
    canMatch: [AuthGuard]
  },
  {
    path: 'settings',
    component: SettingsComponent,
    canMatch: [AuthGuard]
  },
  {
    path: '',
    redirectTo: '/list',
    pathMatch: 'full'
  },
  {
    path: '**',
    component: NotFound
  }

]

import { Routes } from '@angular/router';
import { SettingsComponent, NotFound, ListComponent, PlayerComponent } from './ui';
import { MsalGuard } from '@azure/msal-angular';

export const routes: Routes = [
  {
    path: 'list',
    component: ListComponent,
    canActivate: [MsalGuard]
  },
  {
    path: 'player',
    component: PlayerComponent,
    canActivate: [MsalGuard]
  },
  {
    path: 'settings',
    component: SettingsComponent,
    canActivate: [MsalGuard]
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

import { Routes } from '@angular/router';
import { SettingsComponent, NotFound, ListComponent, PlayerComponent } from './ui';
import { MsalGuard } from '@azure/msal-angular';

export const routes: Routes = [
  {
    path: 'list',
    component: ListComponent,
    canActivate: [],
    pathMatch: 'full'
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
    path: '**',
    component: NotFound
  }

]

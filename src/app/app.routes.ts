import { Routes } from '@angular/router';
import { SettingsComponent, NotFound, ListComponent, PlayerComponent } from './ui';
import { MsalGuard, MsalRedirectComponent } from '@azure/msal-angular';
import { MatSidenavModule } from '@angular/material/sidenav';

export const routes: Routes = [
  {
    path: 'auth',
    component: MsalRedirectComponent
  },
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

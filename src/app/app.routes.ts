import { Routes } from '@angular/router';
import { NotFound, ListComponent, PlayListComponent } from './ui';
import { SignIn } from '../auth/signIn.component';
import { AuthGuard, PKCECallbackGuard } from './auth.guard';
export const routes: Routes = [
  {
    path: 'auth',
    component: SignIn
  },
  {
    path: 'play',
    component: PlayListComponent,
    canMatch: [AuthGuard]
  },
  {
    path: 'list',
    component: ListComponent,
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

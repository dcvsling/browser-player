
import { Observable, Subject, filter, from, iif, map, takeUntil, tap } from 'rxjs';
import { Component, Inject, OnDestroy, OnInit, Signal, WritableSignal, computed, inject, signal } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatGridListModule } from '@angular/material/grid-list';
import { AccessTokenProvider, AuthComponent, CODE_WITH_PKCE, fromQueryParams, GetCodeWithPKCEResponse} from '../auth';
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterModule, MatToolbarModule, MatButtonModule, MatIconModule, MatGridListModule, AuthComponent],
  template: `
    <mat-toolbar class="topbar">
      <button mat-icon-button routerLink="/player"><mat-icon>play_arrow</mat-icon></button>
      <button mat-icon-button routerLink="/list"><mat-icon>folder</mat-icon></button>
      <!-- <button mat-icon-button routerLink="/settings"><mat-icon>setting</mat-icon></button> -->
      <!-- <span>{{ path() }}</span> -->
      <auth-button></auth-button>
    </mat-toolbar>
    <div class="container">
      <router-outlet></router-outlet>
    </div>

  `,
  styles: [`
    :host {
      margin: 0;
      padding: 0;
      height: 100%;
      width: 100%;
      overflow-y: hidden
    }
    .topbar {
      height: 7%;
    }
    .container {
      height: 93%;
      width: 100%;
      overflow-y: hidden;
    }
  `]
})
export class AppComponent implements OnInit {
  private provider: AccessTokenProvider = inject(AccessTokenProvider);
  private router = inject(Router);
  ngOnInit() {
    if(location.search.indexOf('code') >= 0) {
      var res = fromQueryParams<GetCodeWithPKCEResponse>(location.search);
      localStorage.setItem(CODE_WITH_PKCE, JSON.stringify(res));
      this.provider.reload();
      this.router.navigateByUrl('/');
    }
  }
}

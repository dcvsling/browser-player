
import { Subject, filter, map, takeUntil } from 'rxjs';
import { Component, Inject, OnDestroy, OnInit, Signal, WritableSignal, computed, inject, signal } from '@angular/core';
import { RouterModule } from '@angular/router';
import { MSAL_GUARD_CONFIG, MsalBroadcastService, MsalGuardConfiguration, MsalService } from '@azure/msal-angular';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatGridListModule } from '@angular/material/grid-list';
import { AuthenticationResult, EventMessage, EventType, InteractionStatus, PopupRequest, RedirectRequest } from '@azure/msal-browser';
import { NgIf } from '@angular/common';
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterModule, MatToolbarModule, MatButtonModule, MatIconModule, MatGridListModule, NgIf],
  template: `
    <mat-toolbar class="topbar">
      <button mat-icon-button routerLink="/list"><mat-icon>folder</mat-icon></button>
      <span>{{ path() }}</span>
      <button mat-icon-button routerLink="/player"><mat-icon>player</mat-icon></button>
      <button mat-icon-button routerLink="/settings"><mat-icon>setting</mat-icon></button>
      <button mat-icon-button (click)="loginRedirect()" *ngIf="isLogin() else logoutT"><mat-icon>login</mat-icon></button>
      <ng-template #logoutT>
        <button mat-icon-button (click)="logout(false)"><mat-icon>logout</mat-icon></button>
      </ng-template>
    </mat-toolbar>
    <router-outlet></router-outlet>

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
export class AppComponent implements OnInit, OnDestroy {
  isLogin: WritableSignal<boolean> = signal(false);
  path: WritableSignal<string> = signal('/');
  msalGuardConfig: MsalGuardConfiguration = inject<MsalGuardConfiguration>(MSAL_GUARD_CONFIG);
  auth: MsalService = inject(MsalService);
  msalBroadcastService: MsalBroadcastService = inject(MsalBroadcastService);
  private readonly _destroying$ = new Subject<void>();
  private _task = this.auth.initialize();
  constructor() {

  }
  ngOnInit() {
    this.checkIsLogin();
    this.auth.instance.enableAccountStorageEvents(); // Optional - This will enable ACCOUNT_ADDED and ACCOUNT_REMOVED events emitted when a user logs in or out of another tab or window
    this.msalBroadcastService.msalSubject$
      .pipe(
        filter((msg: EventMessage) => msg.eventType === EventType.ACCOUNT_ADDED || msg.eventType === EventType.ACCOUNT_REMOVED),
      )
      .subscribe((result: EventMessage) => {
        if (this.auth.instance.getAllAccounts().length === 0) {
          window.location.pathname = "/";
        } else {
          this.checkIsLogin();
        }
      });

    this.msalBroadcastService.inProgress$
      .pipe(
        filter((status: InteractionStatus) => status === InteractionStatus.None),
        takeUntil(this._destroying$)
      )
      .subscribe(() => {
        this.checkIsLogin();
        let activeAccount = this.auth.instance.getActiveAccount();

        if (!activeAccount && this.auth.instance.getAllAccounts().length > 0) {
          let accounts = this.auth.instance.getAllAccounts();
          this.auth.instance.setActiveAccount(accounts[0]);
        }

      })
  }
  loginRedirect() {
    if (this.msalGuardConfig.authRequest){
      this.auth.loginRedirect({...this.msalGuardConfig.authRequest} as RedirectRequest);
    } else {
      this.auth.loginRedirect();
    }
  }

  logout(popup?: boolean) {
    if (popup) {
      this.auth.logoutPopup({
        mainWindowRedirectUri: "/"
      });
    } else {
      this.auth.logoutRedirect();
    }
  }
  loginPopup() {
    if (this.msalGuardConfig.authRequest){
      this.auth.loginPopup({...this.msalGuardConfig.authRequest} as PopupRequest)
        .subscribe((response: AuthenticationResult) => {
          this.auth.instance.setActiveAccount(response.account);
        });
      } else {
        this.auth.loginPopup()
          .subscribe((response: AuthenticationResult) => {
            this.auth.instance.setActiveAccount(response.account);
      });
    }
  }
  private checkIsLogin() {
    this.isLogin.set(this.auth.instance.getAllAccounts().length > 0);
  }

  ngOnDestroy(): void {
    this._destroying$.next(undefined);
    this._destroying$.complete();
  }
}

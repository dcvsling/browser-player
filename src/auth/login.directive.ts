import { CommonModule, NgTemplateOutlet } from '@angular/common';
import { AfterContentInit, AfterViewInit, Component, computed, Directive, EmbeddedViewRef, inject, OnInit, Signal, TemplateRef, Type, viewChild, ViewContainerRef } from '@angular/core';
import { AccessTokenProvider } from './token';

@Component({
  selector: 'auth-button',
  standalone: true,
  imports: [CommonModule],
  template: `
  <ng-container *ngTemplateOutlet="isLogin ? logout : login"></ng-container>
  <ng-template #login>
    <button (click)="runLogin()">login</button>
  </ng-template>
  <ng-template #logout>
    <button (click)="runLogout()">logout</button>
  </ng-template>
  `,
})
export class AuthComponent {
  private provider: AccessTokenProvider = inject(AccessTokenProvider);
  get isLogin() { return this.provider.isLogin; }
  runLogin(): void {
    this.provider.getAccessToken();
  }
  runLogout(): void {
    this.provider.reset();
  }
}

export interface Context<T> {
  $implicit: T;
}

@Directive({
  selector: 'auth-login',
  standalone: true,
  host: {
    '(click)': 'onclick()'
  }
})
export class Login {
  private provider: AccessTokenProvider = inject(AccessTokenProvider);

}

@Directive({
  selector: 'auth-logout',
  standalone: true,
  host: {
    '(click)': 'onclick()'
  }
})
export class Logout {
  private provider: AccessTokenProvider = inject(AccessTokenProvider);
  onclick(): void {
    this.provider.reset();
  }
}

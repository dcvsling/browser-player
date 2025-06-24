import { inject, Injectable, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { ActivatedRouteSnapshot, CanActivate, CanMatch, GuardResult, MaybeAsync, Route, RouterStateSnapshot, UrlSegment } from "@angular/router";
import { AuthClient } from '../auth/auth.client';
import { IAccessTokenProvider, REDIRECT_TO_RESTORE_STATE, STATE } from '../auth';

@Injectable({ providedIn: 'root' })
export class AuthGuard implements CanMatch, CanActivate {
  private client = inject(IAccessTokenProvider);
  canMatch(_: Route, __: UrlSegment[]): MaybeAsync<GuardResult> {
    return this.tryAuth();
  }
  canActivate(_: ActivatedRouteSnapshot, __: RouterStateSnapshot): MaybeAsync<GuardResult> {
    return this.tryAuth();
  }
  private async tryAuth(): Promise<boolean> {
    const token = await this.client.getAccessToken();
    return this.client.isAuth;
  }
}


@Injectable({ providedIn: 'root' })
export class PKCECallbackGuard implements CanMatch, CanActivate {
  private platformId = inject(PLATFORM_ID);
  canMatch(_: Route, __: UrlSegment[]): MaybeAsync<GuardResult> {
    return this.hasSessionData();
  }
  canActivate(_: ActivatedRouteSnapshot, __: RouterStateSnapshot): MaybeAsync<GuardResult> {
    return this.hasSessionData();
  }
  private hasSessionData(): boolean {
    if (!isPlatformBrowser(this.platformId)) {
      return false;
    }
    const state = sessionStorage.getItem(STATE);
    return !!state
      && !!sessionStorage.getItem(REDIRECT_TO_RESTORE_STATE)
      && location.search.startsWith('?code=');
  }
}

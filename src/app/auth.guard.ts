import { inject, Injectable } from '@angular/core';
import { AccessTokenProvider } from '../auth/token';
import { ActivatedRouteSnapshot, CanActivate, CanMatch, GuardResult, MaybeAsync, Route, RouterStateSnapshot, UrlSegment } from "@angular/router";

@Injectable({ providedIn: 'root' })
export class AuthGuard implements CanMatch, CanActivate {
  private provider = inject(AccessTokenProvider);
  canMatch(_: Route, __: UrlSegment[]): MaybeAsync<GuardResult> {
    return this.provider.isLogin;
  }
  canActivate(_: ActivatedRouteSnapshot, __: RouterStateSnapshot): MaybeAsync<GuardResult> {
    return this.provider.isLogin;
  }
}

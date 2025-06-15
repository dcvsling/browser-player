

import { inject, Injectable, InjectionToken } from "@angular/core";
import { Router } from "@angular/router";
import { GetAccessTokenResponse } from "./models";
import { AuthClient } from "./auth.client";
import { lastValueFrom } from "rxjs";
import { whenDev } from "../environment";

const IAccessTokenProvider = new InjectionToken<IAccessTokenProvider>(`access token provider`);

interface IAccessTokenProvider {
  isAuth: boolean;
  getAccessToken(): Promise<string>;
}

@Injectable({
  providedIn: 'root',
})
export class AuthTokerStore implements IAccessTokenProvider {
  constructor(private client: AuthClient, private worker: Worker) {
    whenDev(() => (window as any)['AuthTokenStore'] = this);
  }
  get isAuth(): boolean {
    return !!this._token;
  }
  router: Router = inject(Router);
  private _token: GetAccessTokenResponse | undefined;

  private _expire: number = Date.now();
  async getAccessToken(): Promise<string> {
    if(!this._token) {
      this.client.RequestCodeWithPKCE();
      return Promise.resolve('redirect to login');
    }
    else if (this._token.access_token && this._expire < Date.now())
      return lastValueFrom(this.client.RefreshAccessToken(this._token));
    else
      return Promise.resolve(this._token.access_token);
  }
  set(token: GetAccessTokenResponse): void {
    this._token = token;
    this.worker.postMessage(this._token.access_token);
    this._expire = token.expires_in * 1000 + Date.now();
  }
}

export { IAccessTokenProvider };

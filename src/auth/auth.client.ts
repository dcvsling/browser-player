import { inject, Injectable } from "@angular/core";
import { GetAccessTokenOptions } from "./options";
import { HttpClient } from "@angular/common/http";
import { ActivatedRoute, Router } from "@angular/router";
import { ApiRequest } from "./api";
import { CODE_WITH_PKCE_EXPIRE, STATE, CODE_WITH_PKCE, REDIRECT_TO_RESTORE_STATE } from "./Constant";
import { GetAccessTokenResponse, GetCodeWithPKCEResponse } from "./models";
import { Observable, tap, map, of, catchError, lastValueFrom } from "rxjs";
import { AuthTokerStore } from "./accessor";
import { IMAGE_RESIZE_WORKER } from "../app/app.component";

@Injectable({ providedIn: 'root' })
export class AuthClient {
  private worker: Worker = inject<Worker>(IMAGE_RESIZE_WORKER);
  private options: GetAccessTokenOptions = inject(GetAccessTokenOptions);
  private http: HttpClient = inject(HttpClient);
  private router: Router = inject(Router);
  private route: ActivatedRoute = inject(ActivatedRoute);
  store: AuthTokerStore = new AuthTokerStore(this, this.worker);
  // get isAuthentied(): boolean {
  //   this.ensureAuth();
  //   return true;
  // }
  RefreshAccessToken(auth: GetAccessTokenResponse): Observable<string> {
    const options = this.options;
    const http = this.http;
    const params = [
      ["client_id", options.client_id],
      ["scope", encodeURIComponent(options.scope.join(' '))],
      ["refresh_token", auth.refresh_token],
      ["grant_type", options.RefreshAccessTokenParameters.grant_type!]
    ];
    var body = params.map(kvp => kvp.join('=')).join('&');
    return http.post<GetAccessTokenResponse>(
        ApiRequest.Token.endpoint,
        body,
        {
          headers: {
            "Content-Type": "application/x-www-form-urlencoded"
          }
        }).pipe(
          tap(this.saveToken.bind(this)),
          map(res => res.access_token),
          catchError((err, caught) => {
            this.RequestCodeWithPKCE();
            return of(err);
          })
        );
    };

  private saveToken(res: GetAccessTokenResponse) {
    this.store.set(res);
    this.worker.postMessage(res.access_token);
    // localStorage.setItem(ACCESS_TOKEN, res.access_token);
    // localStorage.setItem(AUTH_TOKEN, JSON.stringify(res));
    // localStorage.setItem(AUTH_TOKEN_EXPIRE, (Date.now() + res.expires_in * 1000).toString());
    // localStorage.setItem(REFRESH_TOKEN_EXPIRE, (Date.now() + res.expires_in * 500).toString());
  }

  // getAccessToken(): Observable<string> {
  //   const pkceToken = localStorage.getItem(CODE_WITH_PKCE);
  //   const pkceExpired = localStorage.getItem(CODE_WITH_PKCE_EXPIRE) ?? '';
  //   const refreshExpire = localStorage.getItem(REFRESH_TOKEN_EXPIRE) ?? '';
  //   if(pkceToken && pkceExpired !== '' && parseFloat(pkceExpired) > Date.now()) {
  //     return this.RefreshAccessToken();
  //   } else if(!pkceToken || refreshExpire && parseFloat(refreshExpire) <= Date.now()) {
  //     this.RequestCodeWithPKCE();
  //   }
  //   return of(localStorage.getItem(ACCESS_TOKEN)!);
  // }
  // ensureAuth(): void {
  //   const token = (localStorage.getItem(ACCESS_TOKEN));
  //   if(!token || parseFloat(localStorage.getItem(AUTH_TOKEN_EXPIRE)!) > Date.now())
  //     this.getAccessToken();
  // }
  RequestAccessToken(res: GetCodeWithPKCEResponse): Promise<string> {
    const params = [
      ["client_id", this.options.client_id],
      ["scope", encodeURIComponent(this.options.scope.join(' '))],
      ["code", res.code],
      ["state", sessionStorage.getItem(STATE)!],
      ["redirect_uri", this.options.GetAcccessTokenParemeters.redirect_uri!],
      ["grant_type", this.options.GetAcccessTokenParemeters.grant_type!],
      ["code_verifier",
        ApiRequest.Token.endpoint.indexOf('consumers') < 0
          ? this.options.GetAcccessTokenParemeters.code_verifier
          : this.options.GetCodeRequestParameters.code_challenge]
    ];
    var body = params.map(kvp => kvp.join('=')).join('&');
    return lastValueFrom(this.http.post<GetAccessTokenResponse>(
      ApiRequest.Token.endpoint,
      body,
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded"
        }
      }).pipe(
        tap(this.saveToken.bind(this)),
        map(res => res.access_token),
        catchError((err, __) => {
          sessionStorage.clear();
          this.RequestCodeWithPKCE();
          return of(err);
        })));
  }
  async RequestCodeWithPKCE() {
    const expire = sessionStorage.getItem(CODE_WITH_PKCE_EXPIRE);
    const options = this.options;
    if(!expire || parseFloat(expire) < Date.now()) {
      sessionStorage.clear();
      const state = this.generateState(5);
      sessionStorage.setItem(STATE, state);
      const params = [
        ['client_id', options.client_id],
        ['response_type', options.GetCodeRequestParameters.response_type],
        ['redirect_uri', options.GetCodeRequestParameters.redirect_uri],
        ['response_mode', options.GetCodeRequestParameters.response_mode],
        ['scope', encodeURIComponent(options.scope.join(' '))],
        ['state', state],
        ['code_challenge', options.GetCodeRequestParameters.code_challenge],
        ['code_challenge_metod', options.GetCodeRequestParameters.code_challenge_method],
      ].map(kvp => kvp.join('=')).join('&');
      sessionStorage.setItem(REDIRECT_TO_RESTORE_STATE, this.route.snapshot.url.reduce((ctx, x) => ctx + '/' +  x.path, ''));
      location.href = ApiRequest.Authorize.endpoint + '?' + params;
      return of();
    } else {
      return await this.RequestAccessToken(JSON.parse(sessionStorage.getItem(CODE_WITH_PKCE)!));
    }
  }

  private generateState(length: number): string {
    return this.generateStateRecurse('', length).toString();
  }

  private generateStateRecurse(current: string, length: number): string {
    return length === current.length ? current : this.generateStateRecurse(current + Math.floor(Math.random()*10).toString(), length);
  }

}

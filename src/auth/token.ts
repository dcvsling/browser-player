import { EventEmitter, inject, Injectable } from "@angular/core";
import { ApiRequest } from "./api";
import { GetAccessTokenOptions } from "./options";
import { ACCESS_TOKEN, AUTH_TOKEN, CODE_WITH_PKCE, EXPIRE_TIME } from './Constant';
import { fromQueryParams, toQueryParams } from './utils';
import { GetCodeWithPKCEResponse, GetAccessTokenResponse } from './models';
import { HttpClient, HttpParams } from "@angular/common/http";

@Injectable({ providedIn: 'root' })
export class AccessTokenProvider {
  private http: HttpClient = inject(HttpClient);
  private options: GetAccessTokenOptions = inject(GetAccessTokenOptions);
  get isLogin() { return !!localStorage.getItem(ACCESS_TOKEN); }
  public onAuthSucceed: EventEmitter<void> = new EventEmitter<void>();
  private accessToken: string = '';
  private inProcess: boolean = false;
  getAccessToken(): string {
    this.checkAndRefreshToken();
    return this.accessToken;
  }
  private getCode() : void {
    if(this.inProcess) return;
    this.inProcess = true;
    var code = localStorage.getItem(CODE_WITH_PKCE);
    if(!code) {
      location.href = ApiRequest.Authorize.endpoint + toQueryParams({
        ...{client_id: this.options.client_id},
        ...this.options.GetCodeRequestParameters
      });
      return;
    }
    this.getToken();

  }
  reset() {
    localStorage.removeItem(ACCESS_TOKEN);
    localStorage.removeItem(AUTH_TOKEN);
    localStorage.removeItem(EXPIRE_TIME);
  }
  reload() {
    this.reset();
    this.getCode();
  }

  private checkAndRefreshToken() {
    const expire =localStorage.getItem(EXPIRE_TIME);
    if(!expire) {
      this.getCode();
      return;
    }
    if(!localStorage.getItem(CODE_WITH_PKCE)) {
      this.getToken();
      return
    }
    if(parseInt(expire) < Date.now()) {
      this.RefreshToken();
      return;
    }
  }
  private RefreshToken() {
      const auth: GetAccessTokenResponse = JSON.parse(localStorage.getItem(AUTH_TOKEN) ?? '{}');

      fetch(ApiRequest.Token + toQueryParams({
        ...this.options.RefreshAccessTokenParameters,
        ...{
          client_id: this.options.client_id,
          refresh_token: auth.refresh_token
        }}))
      .then(res => res.json())
      .then(this.writeToken)
      .catch(console.error);
  }

  private getToken() {
      const res: GetCodeWithPKCEResponse = JSON.parse(localStorage.getItem(CODE_WITH_PKCE)!);

      var params = new HttpParams();
      params.append('client_id', this.options.client_id)
      params.append('code_verifier', this.options.GetAcccessTokenParemeters.code_verifier!)
      params.append('grant_type', this.options.GetAcccessTokenParemeters.grant_type!);
      params.append('redirect_uri', this.options.GetAcccessTokenParemeters.redirect_uri!);
      params.append('scope', this.options.GetAcccessTokenParemeters.scope!);
      params.append('code', res.code)
      var url = ApiRequest.Token.endpoint + '?' + new URLSearchParams();

      this.http.post<GetAccessTokenResponse>(url, null, { params })
        .subscribe((res: GetAccessTokenResponse) => {
          this.writeToken(res);
          this.onAuthSucceed.emit();
        });
  }


  private writeToken(res: GetAccessTokenResponse) {
    localStorage.setItem(ACCESS_TOKEN, res.access_token);
    localStorage.setItem(AUTH_TOKEN, JSON.stringify(res));
    localStorage.setItem(EXPIRE_TIME, (Date.now() + res.expires_in).toString());
  }
}

import { HttpClient } from "@angular/common/http";
import { Observable, tap, map, from } from "rxjs";
import { ApiRequest } from "./api";
import { ensureCodeWithPKCE, RequestCodeWithPKCE } from "./codeWithPKCE.auth";
import { AUTH_TOKEN, ACCESS_TOKEN, AUTH_TOKEN_EXPIRE, CODE_WITH_PKCE_EXPIRE, CODE_WITH_PKCE, STATE, REFRESH_TOKEN_EXPIRE } from "./Constant";
import { GetAccessTokenResponse, GetCodeWithPKCEResponse } from "./models";
import { GetAccessTokenOptions } from "./options";

export function RefreshAccessToken(options: GetAccessTokenOptions, http: HttpClient): Observable<string> {
  const auth: GetAccessTokenResponse = JSON.parse(localStorage.getItem(AUTH_TOKEN)!);
  if(!auth) return RequestAccessToken(options, http);
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
        tap(saveToken),
        map(res => res.access_token));
}

function saveToken(res: GetAccessTokenResponse) {
  localStorage.setItem(ACCESS_TOKEN, res.access_token);
  localStorage.setItem(AUTH_TOKEN, JSON.stringify(res));
  localStorage.setItem(AUTH_TOKEN_EXPIRE, (Date.now() + res.expires_in * 1000).toString());
  localStorage.setItem(REFRESH_TOKEN_EXPIRE, (Date.now() + res.expires_in * 500).toString());
}

export function getAccessToken(options: GetAccessTokenOptions, http: HttpClient): Observable<string> {
  const authExpire = localStorage.getItem(AUTH_TOKEN_EXPIRE);
  ensureCodeWithPKCE(options);
  if(!authExpire) {
    return RequestAccessToken(options, http);
  } else if(parseFloat(authExpire) < Date.now()) {
    localStorage.clear();
    ensureCodeWithPKCE(options);
  } else if(parseFloat(localStorage.getItem(REFRESH_TOKEN_EXPIRE) ?? '0') < Date.now()) {
    return RefreshAccessToken(options, http);
  }
  return from(localStorage.getItem(ACCESS_TOKEN)!);
}


export function RequestAccessToken(options: GetAccessTokenOptions, http: HttpClient): Observable<string> {
  var res = JSON.parse(localStorage.getItem(CODE_WITH_PKCE)!);
  const params = [
    ["client_id", options.client_id],
    ["scope", encodeURIComponent(options.scope.join(' '))],
    ["code", res.code],
    ["state", localStorage.getItem(STATE)!],
    ["redirect_uri", options.GetAcccessTokenParemeters.redirect_uri!],
    ["grant_type", options.GetAcccessTokenParemeters.grant_type!],
    ["code_verifier",
      ApiRequest.Token.endpoint.indexOf('consumers') < 0
        ? options.GetAcccessTokenParemeters.code_verifier
        : options.GetCodeRequestParameters.code_challenge]
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
      tap(saveToken),
      map(res => res.access_token));
}

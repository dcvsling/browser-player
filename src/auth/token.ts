import { inject, Injectable } from "@angular/core";
import { GetAccessTokenOptions } from "./options";
import { ACCESS_TOKEN } from './Constant';
import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";
import { getAccessToken } from "./accessToken.auth";

@Injectable({ providedIn: 'root' })
export class AccessTokenProvider {
  private http: HttpClient = inject(HttpClient);
  private options: GetAccessTokenOptions = inject(GetAccessTokenOptions);
  get isLogin() { return !!localStorage.getItem(ACCESS_TOKEN); }
  get accessToken$(): Observable<string> {
    return getAccessToken(this.options, this.http);
  }
}

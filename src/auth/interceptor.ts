import { HttpRequest, HttpInterceptor, HttpEvent, HttpHandler, HttpEventType } from "@angular/common/http";
import { inject, Injectable } from "@angular/core";
import { AccessTokenProvider } from "./token";
import { map, mergeMap, Observable, toArray } from "rxjs";

@Injectable({ providedIn: 'root' })
export class AuthHttpInterceptor implements HttpInterceptor {
  private _provider: AccessTokenProvider = inject(AccessTokenProvider);
  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    if(req.url.startsWith(`https://login.microsoftonline.com`)) {
      return next.handle(req);
    }
    return this._provider.accessToken$.pipe(
      toArray(),
      map(ar => ar.join('')),
      mergeMap(token => next.handle(
        req.clone({ headers: req.headers.append('Authorization', 'bearer ' + token) }))));
  }
}

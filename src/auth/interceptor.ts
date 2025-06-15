import { HttpRequest, HttpInterceptor, HttpEvent, HttpHandler, HttpEventType, HttpInterceptorFn } from "@angular/common/http";
import { inject, Injectable } from "@angular/core";
import { from, mergeMap, Observable, of } from "rxjs";
import { AuthClient } from "./auth.client";
import { IAccessTokenProvider } from "./accessor";

@Injectable({ providedIn: 'root' })
export class AuthHttpInterceptor implements HttpInterceptor {
  private _token: IAccessTokenProvider = inject(IAccessTokenProvider);
  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    return retry(httpStatusHandle, 3)(
      req,
      req => appendAccessTokenWhenNotIgonres(this._token)(
        req,
        next.handle)
    );
  }
}

const ignores: string[] = [
  `https://login.microsoftonline.com`
];

function httpStatusHandle(res: HttpEvent<any>): boolean {
  switch(res.type) {
    case HttpEventType.ResponseHeader:
      return res.status / 100 !== 4;
    default:
      break;
  }
  return true;
}

function appendAccessTokenWhenNotIgonres(auth: IAccessTokenProvider, ignoreList: string[] = ignores): HttpInterceptorFn {
  return (req, next) => !!ignoreList.find(url => req.url.startsWith(url))
    ? next(req)
    : from(auth.getAccessToken())
      .pipe(mergeMap(token => next(req.clone({ headers: req.headers.append('Authorization', 'bearer ' + token) }))));
}

function retry(predicate: (res: HttpEvent<any>) => boolean = httpStatusHandle, times: number): HttpInterceptorFn {
  return (req, next) => next(req).pipe(mergeMap(res =>
    predicate(res)
      ? of(res)
      : times > 0
        ? logAction(`${times}: retry`, () => retry(predicate, --times)(req, next))
        : of(res)));

  function logAction<T>(msg: string, func: (() => T)): T {
    console.log(msg);
    return func();
  }
}

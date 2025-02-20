import { HttpRequest, HttpInterceptorFn, HttpHandlerFn, HttpContextToken, HttpInterceptor, HttpEvent, HttpHandler } from "@angular/common/http";
import { inject, Injectable } from "@angular/core";
import { AccessTokenProvider } from "./token";
import { Observable } from "rxjs";

@Injectable({ providedIn: 'root' })
export class AuthHttpInterceptor implements HttpInterceptor {
  private _provider: AccessTokenProvider = inject(AccessTokenProvider);
  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    return next.handle(req.clone({
      headers: req.headers.append('Authorization', 'bearer ' + localStorage.getItem('access_token'))
    }));
  }

}

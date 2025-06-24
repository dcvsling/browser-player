
import { Component, inject, OnInit, PLATFORM_ID } from "@angular/core";
import { isPlatformBrowser } from "@angular/common";
import { Router } from "@angular/router";
import { AuthClient } from "./auth.client";
import { CODE_WITH_PKCE, CODE_WITH_PKCE_EXPIRE, CODE_WITH_PKCE_EXPIRE_TIME, REDIRECT_TO_RESTORE_STATE, STATE } from "./Constant";
import { fromQueryParams } from "./utils";
import { GetCodeWithPKCEResponse } from "./models";

@Component({
  template: ``,
  standalone: true
})
export class SignIn implements OnInit {
  private platformId = inject(PLATFORM_ID);
  private auth: AuthClient = inject(AuthClient);
  private router: Router = inject(Router);
  platform = inject(PLATFORM_ID);
  get sessionStorage(): Storage | void {
    if(isPlatformBrowser(this.platform))
      return sessionStorage;
  }
  get location(): Location | void {
    if(isPlatformBrowser(this.platform))
      return location;
  }
  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    this.HandleCodeWithPKCE().then(() => {
      let redirectUrl = this.sessionStorage?.getItem(REDIRECT_TO_RESTORE_STATE) ?? '/';
      this.sessionStorage?.clear();
      console.log('redirect to ' + redirectUrl);
      if (redirectUrl === this.router.url) {
        redirectUrl = '/list';
      }
      this.router.navigateByUrl(redirectUrl);
    });
  }


  private async HandleCodeWithPKCE(): Promise<void> {
    console.log('Handle Code With PKCE');
    if(this.location?.search.startsWith('?code=')) {
      var res = fromQueryParams<GetCodeWithPKCEResponse>(this.location?.search);
      if(res.state !== this.sessionStorage?.getItem(STATE))
        return;
      this.sessionStorage?.setItem(CODE_WITH_PKCE, JSON.stringify(res));
      this.sessionStorage?.setItem(CODE_WITH_PKCE_EXPIRE, (Date.now() + CODE_WITH_PKCE_EXPIRE_TIME).toString());
      await this.auth.RequestAccessToken(res);
      return;
    }
    await this.auth.store.getAccessToken();
  }
}

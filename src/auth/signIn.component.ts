
import { Component, inject, OnInit } from "@angular/core";
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
  private auth: AuthClient = inject(AuthClient);
  private router: Router = inject(Router);
  ngOnInit(): void {
    this.HandleCodeWithPKCE()
      .then(() => {
        let redirectUrl = sessionStorage.getItem(REDIRECT_TO_RESTORE_STATE) ?? '/';
        sessionStorage.clear();
        console.log('redirect to ' + redirectUrl);
        if(redirectUrl === this.router.url)
          redirectUrl = '/list';
        this.router.navigateByUrl(redirectUrl);
      });
  }


  private async HandleCodeWithPKCE(): Promise<void> {
    console.log('Handle Code With PKCE');
    if(location.search.startsWith('?code=')) {
      var res = fromQueryParams<GetCodeWithPKCEResponse>(location.search);
      if(res.state !== sessionStorage.getItem(STATE))
        return;
      sessionStorage.setItem(CODE_WITH_PKCE, JSON.stringify(res));
      sessionStorage.setItem(CODE_WITH_PKCE_EXPIRE, (Date.now() + CODE_WITH_PKCE_EXPIRE_TIME).toString());
      await this.auth.RequestAccessToken(res);
      return;
    }
    await this.auth.store.getAccessToken();
  }
}

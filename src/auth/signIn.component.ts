
import { ApplicationInitStatus, Component, inject, OnInit } from "@angular/core";
import { fromQueryParams } from "./utils";
import { GetCodeWithPKCEResponse } from "./models";
import { AccessTokenProvider } from "./token";
import { CODE_WITH_PKCE } from "./Constant";
import { Router } from "@angular/router";
@Component({
  template: ``,
  standalone: true
})
export class SignIn implements OnInit {
  private provider: AccessTokenProvider = inject(AccessTokenProvider);
  private router: Router = inject(Router);
  ngOnInit(): void {
    if(location.search.indexOf('code') < 0) {
      var res = fromQueryParams<GetCodeWithPKCEResponse>(location.search);
      localStorage.setItem(CODE_WITH_PKCE, location.search);
      this.provider.reload();
    }
    this.router.navigateByUrl('/');
  }
}

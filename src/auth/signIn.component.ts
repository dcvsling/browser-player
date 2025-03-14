
import { Component, inject, OnInit } from "@angular/core";

import { Router } from "@angular/router";
import { GetAccessTokenOptions } from "./options";
import { HttpClient } from "@angular/common/http";
import { RequestAccessToken } from "./accessToken.auth";
import { HandleCodeWithPKCE } from "./codeWithPKCE.auth";
@Component({
  template: ``,
  standalone: true
})
export class SignIn implements OnInit {
  private options: GetAccessTokenOptions = inject(GetAccessTokenOptions);
  private http: HttpClient = inject(HttpClient);
  private router: Router = inject(Router);
  ngOnInit(): void {
    if(HandleCodeWithPKCE())
      RequestAccessToken(this.options, this.http)
        .subscribe({
          next: _ => this.router.navigate(['/']),
          error: console.error
        });
    else
      console.error(location.search.slice(1).replaceAll('&', '\n'));
  }
}

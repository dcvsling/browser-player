import { Directive, inject, OnInit } from '@angular/core';
import { AccessTokenProvider } from './token';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { GetAccessTokenOptions } from './options';
import { AUTH_TOKEN_EXPIRE, CODE_WITH_PKCE_EXPIRE } from './Constant';
import { getAccessToken, RequestAccessToken } from './accessToken.auth';
import { ensureCodeWithPKCE, RequestCodeWithPKCE } from './codeWithPKCE.auth';

@Directive({
  standalone: true
})
export class AuthDirective implements OnInit {
  private http = inject(HttpClient);
  private router = inject(Router);
  private options = inject(GetAccessTokenOptions);
  private provider = inject(AccessTokenProvider);
  ngOnInit() {
    ensureCodeWithPKCE(this.options);
    getAccessToken(this.options, this.http)
      .subscribe();
  }
  get isLogin() { return this.provider.isLogin; }
}

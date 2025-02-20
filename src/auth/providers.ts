import { provideRouter, provideRoutes, ROUTES, Routes } from '@angular/router';
import { CommonModule } from "@angular/common";
import { HTTP_INTERCEPTORS, HttpClientModule, provideHttpClient, withFetch, withInterceptorsFromDi } from "@angular/common/http";
import { NgModule, makeEnvironmentProviders } from "@angular/core";
import { MSAL_GUARD_CONFIG, MSAL_INSTANCE, MSAL_INTERCEPTOR_CONFIG, MsalBroadcastService, MsalGuard, MsalInterceptor, MsalModule, MsalService } from "@azure/msal-angular";
import { InteractionType, LogLevel, PublicClientApplication } from "@azure/msal-browser";
import { DriveClient, MSGraphClient } from "../graph";
import { MsalAuthentication } from "./auth";
import { AuthHttpInterceptor } from "./interceptor";
import { GetAccessTokenOptions } from "./options";
import { urlencoded } from "express";
import { SignIn } from './signIn.component';



@NgModule({
  imports: [
    CommonModule,
    HttpClientModule,
    MsalModule
  ],
  providers: [

  ],
  exports: [HttpClientModule, MsalModule]
})
export class AuthModule {

}

export function provideAuth() {
  return makeEnvironmentProviders([
    provideHttpClient(withInterceptorsFromDi(), withFetch()),
    {
      provide: HTTP_INTERCEPTORS,
      useClass: AuthHttpInterceptor,
      multi: true,
    },
    {
      provide: GetAccessTokenOptions,
      useValue: {
        client_id: 'a39d10ff-3017-4e23-aef6-aeecf2688b52',
        GetAcccessTokenParemeters: {
          grant_type: "authorization_code",
          scope: encodeURIComponent('https://graph.microsoft.com/mail.read'),
          redirect_uri: encodeURIComponent("http://localhost:4200"),
          code_verifier: "Qhc7E80PF3_cDAXKm9VrWvoUC9Q8An3gFcVIbf_aCCsE4zQUu52RRD0xabn2YnnKkWlk8NUJR-ayXmkn5sj3DDGrvF5Z-m4xV0NaMtwO4QDaTFX6aZQmFeeaoc3G2XRe"
        },
        GetCodeRequestParameters: {
          response_type: 'code',
          scope: encodeURIComponent('https://graph.microsoft.com/mail.read'),
          redirect_uri: encodeURIComponent("http://localhost:4200"),
          response_mode: 'query',
          code_challenge: 'lDWlVpUqjMWhd2G3ZonHuH7ZvTvPSDdO2l4qaNcWXiM',
          code_challenge_method: 'S256'
        },
        RefreshAccessTokenParameters: {
          grant_type: 'refresh_token'
        }
      } as GetAccessTokenOptions
    }
  ]);
}

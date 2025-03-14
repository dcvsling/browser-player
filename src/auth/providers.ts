import { HTTP_INTERCEPTORS, withFetch, provideHttpClient, withInterceptorsFromDi } from "@angular/common/http";
import { makeEnvironmentProviders } from "@angular/core";
import { AuthHttpInterceptor } from "./interceptor";
import { GetAccessTokenOptions } from "./options";



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
        scope: [
          "https://graph.microsoft.com/User.Read",
          "https://graph.microsoft.com/Files.Read",
          "https://graph.microsoft.com/Files.Read.All"
        ],
        GetAcccessTokenParemeters: {
          grant_type: "authorization_code",
          redirect_uri: encodeURIComponent("http://localhost:4200/auth"),
          code_verifier: "HfdeySOBvTW4aAu3S0jRC4U-Njvhn0gaK733LJhB4Q-sXGrKP9RSNJg9FWX338WV0f28UpLQV-SROg2jXealgS4Qen53ViQjhi2T4MmULNtKYHRbRClJOzMbvheHl-uY"
        },
        GetCodeRequestParameters: {
          response_type: 'code',
          redirect_uri: encodeURIComponent("http://localhost:4200/auth"),
          response_mode: 'query',
          code_challenge: '778s-lN2H4vsQE45ckbqaTPVEfgcd-oY1RiGUwmOtVs',
          code_challenge_method: 'S256'
        },
        RefreshAccessTokenParameters: {
          grant_type: 'refresh_token'
        }
      } as GetAccessTokenOptions
    }
  ]);
}

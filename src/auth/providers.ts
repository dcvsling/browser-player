import { HTTP_INTERCEPTORS, withFetch, provideHttpClient, withInterceptorsFromDi } from "@angular/common/http";
import { makeEnvironmentProviders } from "@angular/core";
import { AuthHttpInterceptor } from "./interceptor";
import { GetAccessTokenOptions } from "./options";
import { AuthClient } from "./auth.client";
import { IAccessTokenProvider } from "./accessor";



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
        client_id: '99a45bd5-73e9-4439-a10d-9d00f9ae0052',
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
    },
    AuthClient,
    {
      provide: IAccessTokenProvider,
      useFactory: (client: AuthClient) => client.store,
      deps: [AuthClient]
    }
  ]);
}

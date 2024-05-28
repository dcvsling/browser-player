import { CommonModule } from "@angular/common";
import { HTTP_INTERCEPTORS, HttpClientModule, provideHttpClient, withFetch, withInterceptorsFromDi } from "@angular/common/http";
import { NgModule, makeEnvironmentProviders } from "@angular/core";
import { MSAL_GUARD_CONFIG, MSAL_INSTANCE, MSAL_INTERCEPTOR_CONFIG, MsalBroadcastService, MsalGuard, MsalInterceptor, MsalModule, MsalService } from "@azure/msal-angular";
import { InteractionType, LogLevel, PublicClientApplication } from "@azure/msal-browser";
import { DriveClient, MSGraphClient } from "../graph";
import { MsalAuthentication } from "./auth";


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

export function provideMsalAuth() {
  return makeEnvironmentProviders([
    provideHttpClient(withInterceptorsFromDi(), withFetch()),
    {
      provide: HTTP_INTERCEPTORS,
      useClass: MsalInterceptor,
      multi: true,
    },
    {
      provide: MSAL_GUARD_CONFIG,
      useValue: {
        interactionType: InteractionType.Redirect,
        authRequest: {
          scopes: ['user.read']
        },
        loginFailedRoute: '/login-failed'
      }
    },
    {
      provide: MSAL_INSTANCE,
      useValue: new PublicClientApplication({
        auth: {
          clientId: "4c18105a-e398-4e42-b815-864ee1dca919",
          authority: "https://login.microsoftonline.com/consumers",
          redirectUri: "/auth",
          postLogoutRedirectUri: "/",
        },
        cache: {
            cacheLocation: "localStorage"
        },
        system: {
          allowNativeBroker: false, // Disables WAM Broker
          loggerOptions: {
            loggerCallback: console.log,
            logLevel: LogLevel.Warning,
            piiLoggingEnabled: false
          }
        }
      })
    },
    {
      provide: MSAL_INTERCEPTOR_CONFIG,
      useValue: {
        interactionType: InteractionType.Redirect, // MSAL Interceptor Configuration
          protectedResourceMap: new Map([
            [`https://graph.microsoft.com/v1.0/me`, ["user.read"]],
            [`https://graph.microsoft.com/v1.0/drives/`, ["user.read", "files.read", "files.read.all"]], //B2D7A30C38920DE8/items/B2D7A30C38920DE8!134726/children?$expand=thumbnails
            [`https://snz04pap002files.storage.live.com/`, ["user.read", "files.read"]],
          ]),
      }
    },
    MsalGuard,
    DriveClient,
    MSGraphClient,
    MsalAuthentication,
    MsalService,
    MsalBroadcastService
  ]);
}

import { ApplicationConfig, ENVIRONMENT_INITIALIZER, importProvidersFrom, makeEnvironmentProviders } from '@angular/core';
import { provideRouter, withEnabledBlockingInitialNavigation } from '@angular/router';

import { routes } from './app.routes';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { BrowserUtils } from '@azure/msal-browser';
import { provideMsalAuth } from '../auth';
import { IMAGE_CONFIG } from '@angular/common';
import { provideLocalStorageDataProvider } from '../storage';
import { VIDEO_LIST_ACEESSOR_PROVIDER } from './services/list.local';



export const appConfig: ApplicationConfig = {
  providers: [
    {
      provide: IMAGE_CONFIG,
      useValue: {
        disableImageSizeWarning: true,
        disableImageLazyLoadWarning: true
      }
    },
    provideRouter(routes,
    ...(!BrowserUtils.isInIframe() && !BrowserUtils.isInPopup()
      ? [withEnabledBlockingInitialNavigation()]
      : []),
    ),
    {
      provide: ENVIRONMENT_INITIALIZER,
      useValue: () => {
        const l = window.location;
        if (l.search[1] === '/' ) {
          var decoded = l.search.slice(1).split('&').map(function(s) {
            return s.replace(/~and~/g, '&')
          }).join('?');
          window.history.replaceState(
            null,
            '',
            l.pathname.slice(0, -1) + decoded + l.hash);
        }
      },
      multi: true
    },
    VIDEO_LIST_ACEESSOR_PROVIDER,
    provideLocalStorageDataProvider('video'),
    provideAnimationsAsync(),
    provideMsalAuth(),
  ]
};

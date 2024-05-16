import { ApplicationConfig, ENVIRONMENT_INITIALIZER, importProvidersFrom, inject, makeEnvironmentProviders } from '@angular/core';
import { Router, provideRouter, withEnabledBlockingInitialNavigation } from '@angular/router';

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
    VIDEO_LIST_ACEESSOR_PROVIDER,
    provideLocalStorageDataProvider('video'),
    provideAnimationsAsync(),
    provideMsalAuth(),
  ]
};

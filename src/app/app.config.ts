
import { ApplicationConfig } from '@angular/core';
import { provideRouter, withDebugTracing, withEnabledBlockingInitialNavigation, withInMemoryScrolling, withRouterConfig } from '@angular/router';

import { routes } from './app.routes';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideAuth } from '../auth';
import { IMAGE_CONFIG } from '@angular/common';
import { AuthGuard, PKCECallbackGuard } from './auth.guard';
import { IMAGE_RESIZE_WORKER } from './app.component';

export const appConfig: ApplicationConfig = {
  providers: [
    {
      provide: IMAGE_CONFIG,
      useValue: {
        disableImageSizeWarning: true,
        disableImageLazyLoadWarning: true
      }
    },
    {
      provide: IMAGE_RESIZE_WORKER,
      useValue: new Worker(new URL('../workers/image-resize.worker', import.meta.url))
    },
    PKCECallbackGuard,
    AuthGuard,
    provideRouter(
      routes,
      withDebugTracing(),
      // withEnabledBlockingInitialNavigation(),
      // withInMemoryScrolling({
      //   scrollPositionRestoration: 'enabled'
      ),
    provideAnimationsAsync(),
    provideAuth()
  ]
};

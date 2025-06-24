
import { ApplicationConfig } from '@angular/core';
import { provideRouter, withDebugTracing, withEnabledBlockingInitialNavigation, withInMemoryScrolling, withRouterConfig } from '@angular/router';

import { routes } from './app.routes';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideAuth } from '../auth';
import { IMAGE_CONFIG } from '@angular/common';
import { AuthGuard, PKCECallbackGuard } from './auth.guard';
import { IMAGE_RESIZE_WORKER } from './app.component';
import { provideClientHydration, withEventReplay, withHttpTransferCacheOptions } from '@angular/platform-browser';

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
      useFactory: () => {
        if (typeof Worker !== 'undefined') {
          return new Worker(new URL('../workers/image-resize.worker', import.meta.url));
        }
        // Dummy worker for SSR/prerender to avoid errors when Worker is undefined
        return {} as Worker;
      }
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
    provideAuth(), 
    provideClientHydration(
       withHttpTransferCacheOptions({
        includePostRequests: true,
      }),
      withEventReplay()
    )
  ]
};

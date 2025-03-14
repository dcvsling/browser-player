
import { ApplicationConfig } from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideAuth } from '../auth';
import { IMAGE_CONFIG } from '@angular/common';
import { AuthGuard } from './auth.guard';



export const appConfig: ApplicationConfig = {
  providers: [
    {
      provide: IMAGE_CONFIG,
      useValue: {
        disableImageSizeWarning: true,
        disableImageLazyLoadWarning: true
      }
    },
    AuthGuard,
    provideRouter(routes),
    provideAnimationsAsync(),
    provideAuth(),
  ]
};

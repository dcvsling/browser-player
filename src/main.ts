import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';

const l = window.location;
debugger;
if (l.search[1] === '/' ) {
  var decoded = l.search.slice(1).split('&').map(function(s) {
    return s.replace(/~and~/g, '&')
  }).join('?');
  window.history.replaceState(null, '', l.pathname.slice(0, -1) + decoded + l.hash);
}

bootstrapApplication(AppComponent, appConfig)
  .catch((err) => console.error(err));

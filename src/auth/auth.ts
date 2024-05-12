
import { Injectable } from '@angular/core';
import { MsalService } from '@azure/msal-angular';

@Injectable({ providedIn: 'root' })
export class MsalAuthentication {
  constructor(private authService: MsalService) {

  }
  async ensureLogin() {
    this.authService.initialize();

    if (!this.authService.instance.getAllAccounts().length) {
      this.authService.loginRedirect();
    }
  }
}

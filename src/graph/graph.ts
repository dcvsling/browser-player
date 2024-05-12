
import { ApiRequest } from "./api";
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { MsalBroadcastService } from '@azure/msal-angular';
import { EventMessage, EventType, InteractionStatus } from '@azure/msal-browser';
import { Observable, filter, race, shareReplay, switchMap } from 'rxjs';

@Injectable()
export class MSGraphClient {
    private _login$;
    constructor(private client: HttpClient, private msal: MsalBroadcastService) {
      this._login$ = race([
        this.msal.msalSubject$
          .pipe(
            filter((msg: EventMessage) => msg.eventType === EventType.LOGIN_SUCCESS)
          ),
        this.msal.inProgress$
          .pipe(
            filter((status: InteractionStatus) => status === InteractionStatus.None)
          )]).pipe(
            shareReplay()
          );
    }
    get<T>(url: string): Observable<T | undefined>;
    get<T>(request: ApiRequest): Observable<T | undefined>;
    get<T>(request: ApiRequest | string): Observable<T | undefined> {
      return this._login$
        .pipe(switchMap(() => this.client.get<T>(typeof request === 'string' ? request : request.endpoint)));
    }

    getStream(url: string): Observable<ArrayBuffer> {
      return this._login$
        .pipe(
          switchMap(() => this.client.get(url, {  observe: 'body', responseType: 'arraybuffer' }))
        );
    }

}

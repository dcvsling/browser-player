
import { ApiRequest } from "./api";
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class MSGraphClient {
    constructor(private client: HttpClient) {
    }
    get<T>(url: string): Observable<T | undefined>;
    get<T>(request: ApiRequest): Observable<T | undefined>;
    get<T>(request: ApiRequest | string): Observable<T | undefined> {
      return this.client.get<T>(typeof request === 'string' ? request : request.endpoint);
    }

    getStream(url: string): Observable<ArrayBuffer> {
      return this.client.get(url, {  observe: 'body', responseType: 'arraybuffer' });
    }
}

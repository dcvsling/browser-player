
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
      return this.client.get<T>(this.createUrl(request));
    }

    private createUrl(request: ApiRequest | string): string {
      if(typeof request === 'string')
        return request;
      if(!request.parameters)
         return request.endpoint;

      const select = `$select=${request.parameters.$select?.join(',')}`;
      const expend = `$expand=${request.parameters.$expand}`;
      const top = `$top=${request.parameters.$top}`;

      return `${request.endpoint}?${ [select, expend, top].join('&') }`;
    }

    getStream(url: string): Observable<ArrayBuffer> {
      return this.client.get(url, {  observe: 'body', responseType: 'arraybuffer' });
    }
}


import { VideoMetadata, DriveResponse } from './video';
import { ApiRequest } from './api';
import { MSGraphClient } from './graph';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, filter, map, shareReplay, tap } from 'rxjs';
import { HttpClient } from '@angular/common/http';

export interface LazyLoad<T> {
  nextUrl?: string;
  data: T;
  load?(): Observable<LazyLoad<T>>;
  count: number;
}

@Injectable({ providedIn: 'root' })
export class DriveClient {
    constructor(private graph: MSGraphClient, private http: HttpClient) { }
    private subject: BehaviorSubject<VideoMetadata[]> = new BehaviorSubject<VideoMetadata[]>([]);
    load(): Observable<VideoMetadata[]> {
      const http = this.http;
      const subject = this.subject;
      this.graph.get<DriveResponse<VideoMetadata>>(ApiRequest.files)
        .pipe(tap(x => processRespnonse(x!))
        ).subscribe();;
      return this.subject.pipe(shareReplay());

      function processRespnonse(response: DriveResponse<VideoMetadata>): void {
        subject.next(response.value);
        if(response['@odata.nextLink'])
          http.get<DriveResponse<VideoMetadata>>(response['@odata.nextLink'] as string)
            .pipe(tap(processRespnonse))
            .subscribe();
        else
          subject.complete();
      }
    }
    loadImage(url:string): Observable<ArrayBuffer> {
      return this.graph.getStream(url);
    }
}

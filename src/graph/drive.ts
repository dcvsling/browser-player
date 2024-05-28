
import { VideoMetadata, DriveResponse } from './video';
import { ApiRequest } from './api';
import { MSGraphClient } from './graph';
import { Injectable } from '@angular/core';
import { Observable, filter, map } from 'rxjs';
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
    load(): Observable<LazyLoad<VideoMetadata[]>> {
      return  this.graph.get<DriveResponse<VideoMetadata>>(ApiRequest.files)
        .pipe(
          filter(tree => tree !== undefined && tree.value.length !== 0),

          map(r => ({
            nextUrl: r?.['@odata.nextLink'] ?? '',
            data: (r?.value ?? []).filter(x => x.file.mimeType.indexOf('video/mp4') >= 0),
            load: this.loadNext(r),
            count: r?.['@odata.count']!
          })),
        )
    }
    private loadNext(res: DriveResponse<VideoMetadata> | undefined): () => Observable<LazyLoad<VideoMetadata[]>> {
      return () => {
        if(!res?.['@odata.nextLink']) return Observable.create({ data: [] });
        return this.http.get<DriveResponse<VideoMetadata>>(res['@odata.nextLink'])
          .pipe(
            filter(tree => tree !== undefined && tree.value.length !== 0),
            map(r => (
                ({ ...{
                  data: (r.value ?? []),
                  count: r['@odata.count']
                },
                ...(r['@odata.nextLink'] ? {
                  nextUrl: r['@odata.nextLink'],
                  load: this.loadNext(r)
                } : {}) }
              )))
            );
      }
    }
    loadImage(url:string): Observable<ArrayBuffer> {
      return this.graph.getStream(url);
    }
}

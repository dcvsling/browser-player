
import { VideoMetadata, VideoSource, ToViduoSource, DriveResponse, getVideoSourceUrl, getThumbnailsUrl, ThumbnailMap, isThumbnail } from './video';
import { ApiRequest } from './api';
import { MSGraphClient } from './graph';
import { Injectable, NgIterable } from '@angular/core';
import { BehaviorSubject, Observable, filter, lastValueFrom, map, shareReplay } from 'rxjs';
import { HttpClient } from '@angular/common/http';

export interface LoadContext<T> {
  data: NgIterable<T>;
  length: number;
}

@Injectable({ providedIn: 'root' })
export class DriveClient {
    constructor(private graph: MSGraphClient, private http: HttpClient) { }
    private subject: BehaviorSubject<LoadContext<VideoSource>> = new BehaviorSubject<LoadContext<VideoSource>>({ data: [], length: 0});
    private thumbnailCache = new Map<string, string | undefined>();
    private thumbnailPending = new Map<string, Promise<string | undefined>>();
    load(): Observable<LoadContext<VideoSource>> {
      return this.graph.get<DriveResponse<VideoMetadata>>(ApiRequest.files)
        .pipe(
          map(response => this.processResponse(response!)));
    }
    private processResponse(response: DriveResponse<VideoMetadata>): LoadContext<VideoSource> {
      return {
        length: response['@odata.count'],
        data: response.value
          .filter(data => data.file.mimeType === 'video/mp4')
          .map(ToViduoSource)
          .filter(x => x !== null)
      };
    }
    getSource(source: VideoSource): Observable<string> {
      return this.graph.get<VideoMetadata>(getVideoSourceUrl(source))
        .pipe(
          map(response => {
            if (response) {
              return response["@microsoft.graph.downloadUrl"];
            }
            return null;
          }),
          filter(x => x !== null),
          shareReplay()
        );
    }

    async getThumbnail(source: VideoSource, size: 'small' | 'medium' | 'large' = 'medium'): Promise<string | undefined> {
      const key = `${source.id}-${size}`;
      if (this.thumbnailCache.has(key)) {
        return this.thumbnailCache.get(key);
      }
      let pending = this.thumbnailPending.get(key);
      if (!pending) {
        pending = lastValueFrom(this.graph.get<DriveResponse<ThumbnailMap>>(getThumbnailsUrl(source)))
          .then((res) => res?.value?.[0]?.[size]?.url)
          .catch(() => undefined)
          .then((url) => {
            this.thumbnailCache.set(key, url);
            this.thumbnailPending.delete(key);
            return url;
          });
        this.thumbnailPending.set(key, pending);
      }
      return pending;
    }
    loadImage(url:string): Observable<ArrayBuffer> {
      return this.graph.getStream(url);
    }
}

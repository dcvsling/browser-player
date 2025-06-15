
import { VideoMetadata, VideoSource, ToViduoSource, DriveResponse, getVideoSourceUrl, getThumbnailsUrl, ThumbnailMap, isThumbnail } from './video';
import { ApiRequest } from './api';
import { MSGraphClient } from './graph';
import { Injectable, NgIterable } from '@angular/core';
import { BehaviorSubject, Observable, filter, map, shareReplay } from 'rxjs';
import { HttpClient } from '@angular/common/http';

export interface LoadContext<T> {
  data: NgIterable<T>;
  length: number;
}

@Injectable({ providedIn: 'root' })
export class DriveClient {
    constructor(private graph: MSGraphClient, private http: HttpClient) { }
    private subject: BehaviorSubject<LoadContext<VideoSource>> = new BehaviorSubject<LoadContext<VideoSource>>({ data: [], length: 0});
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

    getThumbnail(source: VideoSource, size: 'small' | 'medium' | 'large' = 'medium'): Observable<string> {
      return this.graph.get<ThumbnailMap>(getThumbnailsUrl(source, ))
        .pipe(
          map(response => response && response && isThumbnail(response[size]) ? response[size].url : undefined),
          filter(x => x !== undefined),
          shareReplay()
        );
    }

    loadImage(url:string): Observable<ArrayBuffer> {
      return this.graph.getStream(url);
    }
}

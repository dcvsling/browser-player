import { Observable } from "rxjs";
import { LazyLoadDataSource } from "../source/lazyload.source";
import { DriveClient, LazyLoad } from "./drive";
import { VideoMetadata } from "./video";
import { Injectable, inject } from "@angular/core";

@Injectable({ providedIn: 'root' })
export class VideoSource extends LazyLoadDataSource<VideoMetadata> {
  drive: DriveClient = inject(DriveClient);
  protected override load(): Observable<LazyLoad<VideoMetadata[]>> {
    return this.drive.load();
  }
}

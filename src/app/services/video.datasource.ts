import { BehaviorSubject, map, mergeMap, Observable, shareReplay, tap } from "rxjs";
import { DriveClient, VideoSource, ToViduoSource } from "../../graph";
import { Injectable, inject } from "@angular/core";
import { CollectionViewer, DataSource } from "@angular/cdk/collections";
import { LocalStorageRef } from "./list.local";
export const VIDEO_LIST_CACHE: string = 'video list cache';

@Injectable({ providedIn: 'root' })
export class VideoDataSource extends DataSource<VideoSource> {
  private buffer: BehaviorSubject<VideoSource[]> = new BehaviorSubject<VideoSource[]>([]);
  drive: DriveClient = inject(DriveClient);
  get length(): number { return this.buffer.value.length; }
  // private debounce: AsyncSubject<void> = new AsyncSubject<void>();
  private cache = new LocalStorageRef<VideoSource>(VIDEO_LIST_CACHE);
  constructor() {
    super();
    this.buffer.next([...this.cache]);
    if(!this.buffer.value || this.buffer.value.length === 0)
    this.drive.load()
      .pipe(
        map(data => data.map(ToViduoSource)),
        tap(data => this.cache.push(...data)))
      .subscribe({
          next: data => this.buffer.next([...this.buffer.value, ...data]),
          error: console.error
        });

  }
  override connect(collectionViewer: CollectionViewer): Observable<readonly VideoSource[]> {
    return collectionViewer.viewChange.pipe(
      mergeMap(({ start, end }: { start: number, end: number }) => this.buffer.pipe(
        shareReplay(),
        map(data => data.slice(start, Math.min(data.length, end) - start)))));
  }
  override disconnect(collectionViewer: CollectionViewer): void {
    // this.cache.set(...this.buffer);
    // this.buffer = [];
  }
}

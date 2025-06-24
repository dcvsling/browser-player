import { AsyncSubject, from, lastValueFrom, map, mergeMap, Observable, tap } from "rxjs";
import { DriveClient, VideoSource } from "../graph";
import { Injectable, InjectionToken, inject } from "@angular/core";
import { CollectionViewer, DataSource as source, ListRange } from "@angular/cdk/collections";
import { LocalStorageRef } from "./list.local";
import { DBManager } from "./dbmanager";

export interface DataSource<T> extends source<T>{
  readonly length: number;
}

export const WAITING_FOR_PLAYER: InjectionToken<LocalStorageRef<VideoSource>> = new InjectionToken<LocalStorageRef<VideoSource>>('waiting for player', { providedIn: 'root', factory() { return new LocalStorageRef<VideoSource>('wait for play') } });


@Injectable({ providedIn: 'root' })
export class VideoDataSource implements DataSource<VideoSource> {
  drive: DriveClient = inject(DriveClient);
  private _length: number = 0;
  db: DBManager = new DBManager({
      dbName: 'videodb',
      index: ['id'],
      keyPath: 'id',
      storeName: 'videos',
      version: 1
     });
  get length(): number { return this._length; }
  private _task: Promise<VideoSource[]>;
  constructor() {
    this._task = this.db.getAll<VideoSource>('videos').then(data => {
      if (data.length <= 0) {
        return lastValueFrom(this.drive.load()
          .pipe(map(({data, length}) => {
            this._length = length;
            const result = Array.from(data);
            this.db.set('videos', ...result);
            return result;
          })));
      } else {
        this._length = data.length;
        return Promise.resolve<VideoSource[]>(data);
      }
    });
  }

  async slice({ start, end }: ListRange): Promise<VideoSource[]> {
    return (await this._task).slice(start, end);
  }

  connect(collectionViewer: CollectionViewer): Observable<VideoSource[]> {
    return collectionViewer.viewChange.pipe(
        mergeMap(({start, end}) => from(this._task).pipe(map(data => data.slice(start, end))))
    );
  }
  disconnect(_: CollectionViewer): void {
    // this.subscription.unsubscribe();
  }
}

export class ExistSource<T> implements DataSource<T> {
  get length(): number { return this.data.length; }
  constructor(private data: readonly T[]) {}
  connect(collectionViewer: CollectionViewer): Observable<readonly T[]> {
    return collectionViewer.viewChange
      .pipe(mergeMap(({ start, end }) => [this.data.slice(Math.max(0, start), Math.min(this.data.length, end)) as readonly T[]]));
  }
  disconnect(collectionViewer: CollectionViewer): void {
    // throw new Error("Method not implemented.");
  }
}
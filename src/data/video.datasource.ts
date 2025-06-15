import { AsyncSubject, from, lastValueFrom, map, mergeMap, Observable, tap } from "rxjs";
import { DriveClient, VideoSource } from "../graph";
import { Injectable, InjectionToken, inject } from "@angular/core";
import { CollectionViewer, DataSource, ListRange } from "@angular/cdk/collections";
import { LocalStorageRef } from "./list.local";
import { DBManager } from "./dbmanager";
export const WAITING_FOR_PLAYER: InjectionToken<LocalStorageRef<VideoSource>> = new InjectionToken<LocalStorageRef<VideoSource>>('waiting for player', { providedIn: 'root', factory() { return new LocalStorageRef<VideoSource>('wait for play') } });;
@Injectable({ providedIn: 'root' })
export class VideoDataSource extends DataSource<VideoSource> {
  drive: DriveClient = inject(DriveClient);
  private _length: number = 0;
  db: DBManager = new DBManager({
      dbName: 'videodb',
      index: ['id'],
      keyPath: 'id',
      storeName: 'videos',
      version: 1
     });
  data: VideoSource[] = [];
  _debounce: AsyncSubject<void> = new AsyncSubject<void>();
  get length(): number { return this._length; }
  private _task: Promise<VideoSource[]>;
  constructor() {
    super();
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
        return Promise.resolve<VideoSource[]>(data);
      }
    });
  }

  async slice({ start, end }: ListRange): Promise<VideoSource[]> {
    return (await this._task).slice(start, end);
  }

  override connect(collectionViewer: CollectionViewer): Observable<VideoSource[]> {
    return collectionViewer.viewChange.pipe(
        mergeMap(({start, end}) => from(this._task).pipe(map(data => data.slice(start, end))))
    );
  }
  override disconnect(_: CollectionViewer): void {
    // this.subscription.unsubscribe();
  }
}

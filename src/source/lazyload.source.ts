import { Injectable, inject } from '@angular/core';
import { CollectionViewer, DataSource } from "@angular/cdk/collections";
import { Observable, iif, map, mergeMap, of } from "rxjs";
import { LazyLoad } from "../graph";
import { DataProvider } from '../storage';

@Injectable({ providedIn: 'root' })
export abstract class LazyLoadDataSource<T = any> extends DataSource<T> {
  cache: DataProvider<T> = inject(DataProvider);
  buffer: T[] = Array.from(this.cache);
  private _loader?: () => Observable<LazyLoad<T[]>>;
  private _length: number = 0;
  get length(): number { return this._length; }
  override connect(collectionViewer: CollectionViewer): Observable<readonly T[]> {
    return collectionViewer.viewChange.pipe(
      mergeMap(this.loadIfOutOfEnd.bind(this)));
  }
  private loadIfOutOfEnd({ start, end }: { start: number, end: number }): Observable<T[]> {
    return iif<T[], T[]>(
      () => this.buffer.length < end,
      (this._loader?.() ?? this.load()).pipe(
        mergeMap(({ data, count, load }) => {
          this.buffer.push(...data);
          this._length = count;
          this._loader = load;
          return [this.buffer];
        }),
        mergeMap(_ => this.loadIfOutOfEnd({ start, end }))
      ),
      of(this.buffer)
    ).pipe(map(data => data.slice(start, end)));
  }
  override disconnect(_: CollectionViewer): void {
    this.cache.set(...this.buffer);
    this.buffer = [];
  }
  protected abstract load(): Observable<LazyLoad<T[]>>;
}

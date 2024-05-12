import { InjectionToken, SimpleChange } from "@angular/core";

export interface DataProvider<T> extends Iterable<T> {
  get(predicate: (t: T) => boolean): T[];
  get(predicate: (t: T, index: number) => boolean): T[];
  set(...value: T[]): void;
  onchange(changes: SimpleChange): void;
}

export const DataProvider = new InjectionToken<DataProvider<any>>('data provider');

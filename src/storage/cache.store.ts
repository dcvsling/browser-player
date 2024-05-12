import { Injectable, inject } from "@angular/core";
import { DataProvider } from "./data.provider";

@Injectable({ providedIn: 'root' })
export class Store<T> {
  provider: DataProvider<T> = inject(DataProvider);
  append(...data: T[]) {
    this.provider.set(...data);
  }
  range(start: number, count: number): T[] {
    const end = start + count;
    this.provider.get((_: T, index: number) => index >= start && index < end);
    return [];
  }
  first(predicate: (t: T) => boolean): T | null {
    const result = this.provider.get(predicate);
    return result.length > 0 ? result[0] : null;
  }
}

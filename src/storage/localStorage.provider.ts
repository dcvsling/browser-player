import { Injectable, InjectionToken, SimpleChange, inject } from "@angular/core";
import { DataProvider } from "./data.provider";

export const LOCAL_STORAGE_NAME_TOKEN = new InjectionToken<string>('storage name');
@Injectable({ providedIn: 'root' })
export class LocalStorageProvider<T> implements DataProvider<T> {
  name: string = inject(LOCAL_STORAGE_NAME_TOKEN);
  private cache: Storage = localStorage;
  data: T[] = JSON.parse(localStorage.getItem(this.name) ?? '[]');
  constructor( ){
    window.addEventListener('beforeunload', () => {
      if(this.data.length > 0)
        this.cache.setItem(this.name, JSON.stringify([...this.data]));
      else
        window.localStorage.removeItem(this.name);
    });
  }
  onchange(changes: SimpleChange): void {
    throw new Error("Method not implemented.");
  }
  [Symbol.iterator](): Iterator<T, any, undefined> {
    return this.data.values();
  }
  get(predicate: (t: T) => boolean): T[];
  get(predicate: (t: T, index: number) => boolean): T[];
  get(predicate: (t: T, index: number) => boolean): T[] {
    return this.data.filter(predicate);
  }
  set(...value: T[]): void {
    new CustomEvent('change', { detail: {  previousValue: this.data, currentValue: [...this.data, ...value] } });
    this.data.push(...value);
  }
}

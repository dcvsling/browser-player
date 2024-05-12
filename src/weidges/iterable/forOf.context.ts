import { NgIterable } from "@angular/core";



export class ForOfContext<T, U extends NgIterable<T> = NgIterable<T>> {
  constructor(
    public $implicit: T,
    public forOf: U,
    public index: number,
    public count: number) {
  }
  get first(): boolean {
    return this.index === 0;
  }

  get last(): boolean {
    return this.index === this.count - 1;
  }

  get even(): boolean {
    return this.index % 2 === 0;
  }

  get odd(): boolean {
    return !this.even;
  }
 }

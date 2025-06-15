import { Injectable } from "@angular/core";


export type JsonPrimitive = string | number | boolean | null;

// 定義一個遞迴型別，用來將 T 轉換成只包含 JSON 允許的部分
type JSONData<T> =
  // 若 T 為基本型別，直接回傳
  T extends JsonPrimitive ? T :
  // 若 T 為陣列，則對其元素套用 JSONData
  T extends Array<infer U> ? JSONData<U>[] :
  // 若 T 為物件，則對其所有屬性遞迴套用 JSONData
  T extends object ? { [K in keyof T]: JSONData<T[K]> } :
  // 其他型別則回傳 never，導致型別錯誤
  never;

export class LocalStorageRef<T extends JSONData<any>> extends Array<T> implements Iterable<T> {
  [n: number]: T;
  constructor(public name: string){
    super();
  }
  has(value: T): boolean {
    return this.indexOf(value) >= 0;
  }
  add(value: T): void {
    if(this.has(value))
      return;
    this.push(value);
  }
  remove(value: T): void {
    let index;
    while((index = this.indexOf(value)) >= 0)
      this.splice(index, 1);
  }
}

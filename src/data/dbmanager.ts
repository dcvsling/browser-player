import { createEnvironmentInjector, EnvironmentProviders, inject, Injectable, InjectionToken, makeEnvironmentProviders, Provider } from "@angular/core";
import { IndexDBStore } from "dashjs";


interface IndexedDbOptions {
  dbName: string;
  version: number;
  storeName: string;
  keyPath?: string | string[] | undefined;
  index?: string[];
}
const IndexedDbOptions = new InjectionToken<IndexedDbOptions>('IndexedDbOptions');
export { IndexedDbOptions };
export type IndexedDbKeyType = IDBValidKey | IDBKeyRange;

// @Injectable({
//   providedIn:'root'
// })
export class DBManager {
  private dbPromise: Promise<IDBDatabase>;
  constructor(private options: IndexedDbOptions) {
    this.dbPromise = this._openDB();
  }

  // 打開並建立所需的 object store
  _openDB(): Promise<IDBDatabase> {
    const {
      dbName,
      version,
      storeName,
      keyPath = undefined,
      index = undefined
    } = this.options;
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(dbName, version);
      req.onupgradeneeded = () => {
        const db = (req as IDBOpenDBRequest).result;

        const s = keyPath 
          ? db.createObjectStore(storeName, { keyPath }) 
          : db.createObjectStore(storeName) ;
        index?.forEach(prop => s.createIndex(prop, prop));
      };

      req.onsuccess = () => resolve(req.result);
      req.onerror   = () => reject(req.error);
    });
  }

  // 取得一張 transaction + objectStore
  private async getStore(name: string , mode: IDBTransactionMode = 'readonly'): Promise<IDBObjectStore> {
    const db = await this.dbPromise;
    return db.transaction(name, mode).objectStore(name);
  }

  /** 讀取 key (`== undefined 如果不存在`) */
  async get<T = any, TKey extends IndexedDbKeyType = IndexedDbKeyType>(name: string, key: TKey): Promise<T> {
    const store = await this.getStore(name, 'readonly');
    return new Promise((res, rej) => {
      const req = store.get(key);
      req.onsuccess = () => res(req.result);
      req.onerror   = () => rej(req.error);
    });
  }
  async set<T>(name: string, ...values: T[]): Promise<void> {
    const store = await this.getStore(name, 'readwrite');
    return new Promise((res, rej) => {
      values.forEach(value => handleEvent(store.add(value)));
      function handleEvent<T>(req: IDBRequest<T>) {
        req.onsuccess = () => res();
        req.onerror   = () => rej(req.error);
      }
    });
  }

  /** 刪除某筆 */
  async delete<T = any, TKey extends IndexedDbKeyType = IndexedDbKeyType>(name: string, key?: TKey): Promise<void> {
    const store = await this.getStore(name, 'readwrite');
    return new Promise((res, rej) => {
      const req = store.delete(key instanceof IDBKeyRange ? key : IDBKeyRange.only(key));
      req.onsuccess = () => res();
      req.onerror   = () => rej(req.error);
    });
  }

  /** 取得整張 store 的所有紀錄 */
  async getAll<T = any>(name: string): Promise<T[]> {
    const store = await this.getStore(name, 'readonly');
    return new Promise((res, rej) => {
      const req = store.getAll();
      req.onsuccess = () => res(req.result);
      req.onerror   = () => rej(req.error);
    });
  }
}

// export class DatabaseStore<T extends object> {
//   private dbPromise: Promise<IDBDatabase> = this._openDB();
//   private dbName: string;
//   private storeName: string;
//   private version: number;
//   constructor(private options: IndexedDbOptions) {
//       this.dbName = this.options.dbName;
//       this.storeName = this.options.storeName;
//       this.version = this.options.version;
//   }
//   // 私有方法：打開（或建立）IndexedDB，回傳 Promise<IDBDatabase>
//   _openDB(): Promise<IDBDatabase> {
//     return new Promise((resolve, reject) => {
//       const request = indexedDB.open(this.dbName, this.version);
//       request.onupgradeneeded = () => {
//         const db = request.result;
//         if (!db.objectStoreNames.contains(this.storeName)) {
//           const store = db.createObjectStore(this.storeName, { keyPath: this.options.keys });
//           (this.options.index ??= []).forEach(key => store.createIndex(key, key));
//         }
//       };
//       request.onsuccess = () => resolve(request.result);
//       request.onerror = () => reject(request.error);
//     });
//   }

//   // 存一個 Blob，key 為字串
//   async set(key: string, data: T) {
//     const db = await this.dbPromise;
//     return new Promise((resolve, reject) => {
//       const tx = db.transaction(this.storeName, 'readwrite');
//       const store = tx.objectStore(this.storeName);
//       const req = store.put(data, key);

//       req.onerror = () => reject(req.error);
//       // 等 transaction 完成再 resolve，確保資料已寫入
//       tx.oncomplete = () => resolve(undefined);
//       tx.onerror = () => reject(tx.error);
//     });
//   }

//   // 取出一個 Blob（如果不存在則回傳 undefined）
//   async get(key: string): Promise<T> {
//     const db = await this.dbPromise;
//     return new Promise((resolve, reject) => {
//       const tx = db.transaction(this.storeName, 'readonly');
//       const store = tx.objectStore(this.storeName);
//       const req = store.get(key);

//       req.onsuccess = () => resolve(req.result);
//       req.onerror = () => reject(req.error);
//     });
//   }
//   async getOrCreate(key: string, factory: () => Promise<T>) {
//     let blob = await this.get(key);
//     if (blob) {
//       return blob;
//     }
//     // 不在快取，就產生並存入
//     blob = await factory();
//     await this.set(key, blob);
//     return blob;
//   }
//   all(): Promise<T[]> {
//     return new Promise((resolve, reject) => {
//       this.dbPromise.then(db => {
//         const tx = db.transaction(this.storeName, 'readonly');
//         const store = tx.objectStore(this.storeName);
//         const req = store.getAll();

//         req.onsuccess = () => resolve(req.result);
//         req.onerror = () => reject(req.error);
//       }).catch(reject);
//     });
//   }
// }

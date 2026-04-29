const DB_NAME = "browser-player-ai-thumbnails";
const STORE_NAME = "thumbnails";
const DB_VERSION = 1;

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("IndexedDB 開啟失敗"));
  });
  return dbPromise;
}

export function makeThumbnailKey(sourceId: string, trackId: string): string {
  return `${String(sourceId || "")}::${String(trackId || "")}`;
}

export async function saveThumbnailBlob(key: string, blob: Blob): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put({
      id: String(key || ""),
      blob,
      type: String(blob.type || "image/jpeg"),
      updatedAt: new Date().toISOString(),
    });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error || new Error("縮圖寫入失敗"));
    tx.onabort = () => reject(tx.error || new Error("縮圖寫入中止"));
  });
}

export async function loadThumbnailBlob(key: string): Promise<Blob | null> {
  const db = await openDb();
  const row = await new Promise<any>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const req = tx.objectStore(STORE_NAME).get(String(key || ""));
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error || new Error("縮圖讀取失敗"));
  });
  return row?.blob instanceof Blob ? row.blob : null;
}

export async function removeThumbnailsBySource(sourceId: string): Promise<void> {
  const prefix = `${String(sourceId || "")}::`;
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const req = store.openCursor();
    req.onsuccess = () => {
      const cursor = req.result;
      if (!cursor) return;
      if (String(cursor.key || "").startsWith(prefix)) {
        cursor.delete();
      }
      cursor.continue();
    };
    req.onerror = () => reject(req.error || new Error("縮圖清除失敗"));
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error || new Error("縮圖清除失敗"));
    tx.onabort = () => reject(tx.error || new Error("縮圖清除中止"));
  });
}

const DB_NAME = "browser-player-ai-local-runtime";
const STORE_NAME = "local-files";
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

function makeKey(sourceId: string, fileId: string): string {
  return `${String(sourceId || "")}::${String(fileId || "")}`;
}

export async function saveLocalRuntimeFile(
  sourceId: string,
  fileId: string,
  file: File
): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    store.put({
      id: makeKey(sourceId, fileId),
      sourceId: String(sourceId || ""),
      fileId: String(fileId || ""),
      blob: file,
      name: String(file.name || "local.mp4"),
      type: String(file.type || "video/mp4"),
      lastModified: Number(file.lastModified || Date.now()),
      updatedAt: new Date().toISOString(),
    });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error || new Error("IndexedDB 寫入失敗"));
    tx.onabort = () => reject(tx.error || new Error("IndexedDB 寫入中止"));
  });
}

export async function loadLocalRuntimeFile(
  sourceId: string,
  fileId: string
): Promise<File | null> {
  const db = await openDb();
  const row = await new Promise<any>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const req = store.get(makeKey(sourceId, fileId));
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error || new Error("IndexedDB 讀取失敗"));
  });
  if (!row?.blob) return null;
  if (row.blob instanceof File) return row.blob;
  return new File([row.blob], String(row.name || "local.mp4"), {
    type: String(row.type || "video/mp4"),
    lastModified: Number(row.lastModified || Date.now()),
  });
}

export async function removeLocalRuntimeFilesBySource(sourceId: string): Promise<void> {
  const sourcePrefix = `${String(sourceId || "")}::`;
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const cursorReq = store.openCursor();
    cursorReq.onsuccess = () => {
      const cursor = cursorReq.result;
      if (!cursor) return;
      if (String(cursor.key || "").startsWith(sourcePrefix)) {
        cursor.delete();
      }
      cursor.continue();
    };
    cursorReq.onerror = () => reject(cursorReq.error || new Error("IndexedDB 清除失敗"));
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error || new Error("IndexedDB 清除失敗"));
    tx.onabort = () => reject(tx.error || new Error("IndexedDB 清除中止"));
  });
}

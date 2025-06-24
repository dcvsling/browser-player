
import { DBManager } from "../data";
import { DriveResponse, getThumbnailsUrl, ThumbnailMap, VideoSource } from "../graph";


export interface ResizeRequest {
  source: VideoSource;
  canvas: OffscreenCanvas;
}

export interface ImageCache {
  id: string;
  width: number;
  height: number;
  content: string
}

const db: DBManager = new DBManager({
        dbName: 'imagedb',
        storeName: 'images',
        keyPath: 'id',
        index: ['id'],
        version: 1
       });

let accessToken: string = '';

const pendingRequests: Map<string, Promise<ImageCache>> = new Map();

addEventListener('message', ({ data }) => {
  if (typeof data === 'string') {
    accessToken = data;
    return;
  }
  const { source } = data as ResizeRequest;
  if (!source) {
    return;
  }
  const id = source.id;
  let request = pendingRequests.get(id);
  if (!request) {
    request = (async () => {
      const cache = await db.get<ImageCache>('images', id);
      if (cache) {
        return cache;
      }
      const newCache = await downloadIamge(source);
      await db.set('images', newCache);
      return newCache;
    })();
    pendingRequests.set(id, request);
    request.finally(() => pendingRequests.delete(id));
  }
  request.then((cache) => postMessage({ id: cache.id, content: cache.content }));
});
async function blobToBase64(blob: Blob): Promise<string> {
  const buffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  const binary = bytes.reduce((data, byte) => data + String.fromCharCode(byte), '');
  return `data:${blob.type};base64,${btoa(binary)}`;
}
async function drawImage(content: Blob) {
  const canvas = new OffscreenCanvas(320, 240);
  const bitmap = await createImageBitmap(content);
  
  const ctx = canvas.getContext('2d');
  if(!ctx) return;
  ctx.drawImage(bitmap, 0, 0);
  bitmap.close();
  return blobToBase64(await canvas.convertToBlob());
}
async function downloadIamge(src: VideoSource): Promise<ImageCache> {
  if(!accessToken || accessToken.length === 0) throw Error('no accesstoken');
  const response = await fetch(getThumbnailsUrl(src), { method: 'GET', headers: { 'Authorization': 'bearer ' + accessToken }})

  if (!response.ok) {
    throw new Error(await response.json());
  }
  const body: DriveResponse<ThumbnailMap> = await response.json();
  const thumnb = body.value[0];
  
  return await fetch(body.value[0].large.url)
    .then(async res => {
      if (!res.ok) {
        throw new Error(await res.text());
      }
      return {
        content: await blobToBase64(await showViaImageBitmap(await res.bytes())),
        width: thumnb.large.width,
        height: thumnb.large.height,
        id: src.id
      };
    })
  async function showViaImageBitmap(data: Uint8Array): Promise<Blob> {
    // 1. 先把 Uint8Array 变成 Blob
    const blob = new Blob([data], { type: 'image/png' });
    // 2. 用 createImageBitmap 解码成 ImageBitmap（不会分配 Blob URL）
    const bitmap = await createImageBitmap(blob);
    // 3. 建一个临时 Canvas，把 ImageBitmap 画上去
    

    return resizeImage(bitmap, 320, 240);
  }
}

async function resizeImage(blob: ImageBitmap, width: number, height: number): Promise<Blob> {
  const img = await createImageBitmap(blob);
  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext('2d');
  if(!ctx) {
    throw new Error('Failed to get canvas context');
  }
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  
  
  const originalWidth = img.width;
  const originalHeight = img.height;
  // 等比縮放的比例，取較小邊
  const scale = Math.min(width / originalWidth, height / originalHeight);
  const scaledWidth = originalWidth * scale;
  const scaledHeight = originalHeight * scale;

  // 對齊中心：讓圖片置中畫布
  const offsetX = (width - scaledWidth) / 2;
  const offsetY = (height - scaledHeight) / 2;

  ctx.clearRect(0, 0, width, height);
  ctx.drawImage(img, offsetX, offsetY, scaledWidth, scaledHeight);

  ctx.drawImage(img, 0, 0, width, height);
  return await canvas.convertToBlob({ type: 'image/png' });
}


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
  content: Blob
}

const db: DBManager = new DBManager({
        dbName: 'imagedb',
        storeName: 'images',
        keyPath: 'id',
        index: ['id'],
        version: 1
       });

let accessToken: string = '';

addEventListener('message', async ({ data }) => {
  if(typeof data === 'string') {
    accessToken = data;
    return;
  }
  const { source, canvas } = data;
  if(!source || !canvas) return;
  const id = source.id;
  db.get<ImageCache>('images', id).then(async cache => {
    let _cache: ImageCache = cache;
    if(!_cache) {
      _cache = await downloadIamge(source);
      db.set('images', _cache);
    }
    drawImage(canvas, _cache);
  })
});

async function drawImage(canvas: OffscreenCanvas, { content }: ImageCache) {
  const bitmap = await createImageBitmap(content);
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext('2d');
  if(!ctx) return;
  ctx.drawImage(bitmap, 0, 0);
  bitmap.close();
}
async function downloadIamge(src: VideoSource): Promise<ImageCache> {
  if(!accessToken || accessToken.length === 0) throw Error('no accesstoken');
  const response = await fetch(getThumbnailsUrl(src), { method: 'GET', headers: { 'Authorization': 'bearer ' + accessToken }})

  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.statusText}`);
  }
  const body: DriveResponse<ThumbnailMap> = await response.json();
  if(body.value.length < 1) throw Error('nagetive image length');
  return await fetch(body.value[0].large.url)
    .then(async res => {
      if (!res.ok) {
        throw new Error(`Failed to fetch image: ${response.statusText}`);
      }
      const thumnb = body.value[0];

      return {
        content: await showViaImageBitmap(await res.bytes()),
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
    const off = new OffscreenCanvas(bitmap.width, bitmap.height);
    const ctx = off.getContext('2d')!;

    ctx.drawImage(bitmap, 0, 0);
    // 4. 从 Canvas 导出为 Blob（也可以直接 toDataURL）
    return await off.convertToBlob({ type: 'image/png' });
  }
}

// async function resizeImage(blob: Blob, width: number, height: number): Promise<Blob> {
//   const img = await createImageBitmap(blob);
//   const canvas = new OffscreenCanvas(width, height);
//   const ctx = canvas.getContext('2d');
//   if(!ctx) {
//     throw new Error('Failed to get canvas context');
//   }

//   ctx.drawImage(img, 0, 0, width, height);
//   return await canvas.convertToBlob();
// }

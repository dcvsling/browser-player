import { FFmpeg } from "@ffmpeg/ffmpeg";
import { toBlobURL } from "@ffmpeg/util";

const baseURL = "https://unpkg.com/@ffmpeg/core-mt@0.12.6/dist/esm";

const ffmpeg = new FFmpeg();


export async function createFFMpeg(): Promise<FFmpeg> {
  if(ffmpeg.loaded) return ffmpeg;
  await ffmpeg.load({
    coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
    wasmURL: await toBlobURL(
      `${baseURL}/ffmpeg-core.wasm`,
      "application/wasm"
    ),
    workerURL: await toBlobURL(
      `${baseURL}/ffmpeg-core.worker.js`,
      "text/javascript"
    ),
  });
  ffmpeg.on('progress', ({ progress, time }) =>  `${progress * 100} % (transcoded time: ${time / 1000000} s)`);
  return ffmpeg;
}

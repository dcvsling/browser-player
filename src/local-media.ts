import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";

let ffmpegInstance = null;
let ffmpegLoadingPromise = null;

const FFMPEG_VERSION = "0.12.10";
const DEFAULT_ACCEPTED_EXT = [".mp4"];

async function getDurationFromFile(file) {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    const url = URL.createObjectURL(file);
    const cleanup = () => {
      video.removeAttribute("src");
      video.load();
      URL.revokeObjectURL(url);
    };

    video.preload = "metadata";
    video.onloadedmetadata = () => {
      const durationMs =
        Number.isFinite(video.duration) && video.duration > 0
          ? Math.round(video.duration * 1000)
          : null;
      cleanup();
      resolve(durationMs);
    };
    video.onerror = () => {
      cleanup();
      resolve(null);
    };
    video.src = url;
  });
}

async function ensureFfmpeg() {
  if (ffmpegInstance) return ffmpegInstance;
  if (ffmpegLoadingPromise) return ffmpegLoadingPromise;

  ffmpegLoadingPromise = (async () => {
    const ffmpeg = new FFmpeg();
    const base = `https://unpkg.com/@ffmpeg/core@${FFMPEG_VERSION}/dist/esm`;
    await ffmpeg.load({
      coreURL: await toBlobURL(`${base}/ffmpeg-core.js`, "text/javascript"),
      wasmURL: await toBlobURL(`${base}/ffmpeg-core.wasm`, "application/wasm"),
    });
    ffmpegInstance = ffmpeg;
    return ffmpeg;
  })();

  try {
    return await ffmpegLoadingPromise;
  } finally {
    ffmpegLoadingPromise = null;
  }
}

function getFileExtension(name) {
  const idx = String(name || "").lastIndexOf(".");
  return idx >= 0 ? String(name).slice(idx).toLowerCase() : "";
}

function isAcceptedFile(file, acceptedExt = DEFAULT_ACCEPTED_EXT) {
  const ext = getFileExtension(file?.name || "");
  return acceptedExt.includes(ext);
}

function createLocalTrackId(sourceId, file) {
  return `local:${sourceId}:${file.name}:${file.size}:${file.lastModified}`;
}

function toIsoOrNull(value) {
  const ms = Number(value);
  if (!Number.isFinite(ms) || ms <= 0) return null;
  return new Date(ms).toISOString();
}

async function extractThumbnailWithFfmpeg(file, sourceId, id) {
  const blob = await extractThumbnailBlobWithFfmpeg(file, sourceId, id);
  return blob ? URL.createObjectURL(blob) : "";
}

export async function extractThumbnailBlobWithFfmpeg(file, sourceId, id) {
  const ffmpeg = await ensureFfmpeg();
  const inName = `in-${sourceId}-${id}.mp4`;
  const outName = `thumb-${sourceId}-${id}.jpg`;

  try {
    await ffmpeg.writeFile(inName, await fetchFile(file));
    await ffmpeg.exec([
      "-i",
      inName,
      "-frames:v",
      "1",
      "-vf",
      "scale=320:-1",
      outName,
    ]);
    const imageData = await ffmpeg.readFile(outName);
    return new Blob([imageData.buffer], { type: "image/jpeg" });
  } catch {
    return null;
  } finally {
    try {
      await ffmpeg.deleteFile(inName);
    } catch {
      // ignore
    }
    try {
      await ffmpeg.deleteFile(outName);
    } catch {
      // ignore
    }
  }
}

export async function buildLocalSourceTracks({
  sourceId,
  files,
  acceptedExt = DEFAULT_ACCEPTED_EXT,
  onProgress,
  extractThumbnails = false,
  extractDurations = false,
}) {
  const fileList = Array.isArray(files) ? files.filter(Boolean) : [];
  const accepted = fileList.filter((file) => isAcceptedFile(file, acceptedExt));
  const trackMap = new Map();
  const runtimeFiles = new Map();

  for (let i = 0; i < accepted.length; i += 1) {
    const file = accepted[i];
    const id = createLocalTrackId(sourceId, file);
    const durationMs = extractDurations ? await getDurationFromFile(file) : null;
    const thumbnailUrl = extractThumbnails ? await extractThumbnailWithFfmpeg(file, sourceId, i) : "";
    const track = {
      id,
      name: file.name,
      webUrl: "",
      streamUrl: "",
      streamUrlExpiresAt: null,
      thumbnailUrl,
      thumbnailKey: "",
      durationMs,
      sizeBytes: Number.isFinite(file.size) ? Math.round(file.size) : null,
      source: "local",
      modifiedAt: toIsoOrNull(file.lastModified),
      driveId: null,
      localSourceId: sourceId,
      localFileId: id,
    };

    trackMap.set(id, track);
    runtimeFiles.set(id, file);
    onProgress?.({
      current: i + 1,
      total: accepted.length,
      message: `處理本機檔案中... ${i + 1}/${accepted.length}`,
    });
  }

  const tracks = [...trackMap.values()].sort((a, b) =>
    String(a.name || "").localeCompare(String(b.name || ""), "zh-Hant")
  );
  return { tracks, runtimeFiles };
}

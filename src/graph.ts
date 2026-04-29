// @ts-nocheck
import { APP_CONFIG } from "./config.js";

const MAX_PAGE_FETCH = 5000;
const DOWNLOAD_URL_FALLBACK_TTL_MS = 50 * 60 * 1000;
const STREAM_URL_REFRESH_SKEW_MS = 15 * 1000;

export async function fetchAllVideosViaDelta(accessToken, onProgress, options = {}) {
  const endpoint = String(options.childrenEndpoint || APP_CONFIG.graph.childrenEndpoint);
  const root = tryParseRootFromChildrenEndpoint(endpoint);
  if (!root) {
    throw new Error("目前 childrenEndpoint 不支援 delta，同步將改用全量 children。");
  }
  const { driveId, itemId } = root;
  const startUrl = decorateDeltaUrl(buildDeltaStartUrl(driveId, itemId));
  const result = await fetchDeltaPages(accessToken, startUrl, onProgress);
  const tracks = toTracksFromItems(result.items, driveId);

  return {
    tracks,
    deltaLink: result.deltaLink,
    latest: computeLatest(tracks),
  };
}

export async function fetchAllVideosViaChildren(accessToken, onProgress, options = {}) {
  const endpoint = String(options.childrenEndpoint || APP_CONFIG.graph.childrenEndpoint);
  const rootItems = await fetchAllPages(getRootChildrenUrl(endpoint), accessToken, onProgress);
  const root = tryParseRootFromChildrenEndpoint(endpoint);
  const driveId = root?.driveId || null;
  const queue = rootItems.map((item) => ({ item, depth: 0 }));
  const videos = new Map();
  const visitedFolders = new Set();

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) break;
    const { item, depth } = current;

    if (isAcceptedVideo(item)) {
      const track = toTrack(item, driveId);
      videos.set(track.id, track);
      continue;
    }

    if (
      APP_CONFIG.graph.includeSubfolders &&
      item?.folder &&
      depth < APP_CONFIG.graph.maxTraversalDepth
    ) {
      const folderKey = `${item?.parentReference?.driveId || driveId}:${item?.id || ""}`;
      if (visitedFolders.has(folderKey)) continue;
      visitedFolders.add(folderKey);

      const childrenUrl = buildChildrenUrl(item, driveId, endpoint);
      const nested = await fetchAllPages(childrenUrl, accessToken, onProgress);
      nested.forEach((child) => queue.push({ item: child, depth: depth + 1 }));
    }
  }

  return [...videos.values()].sort((a, b) => a.name.localeCompare(b.name, "zh-Hant"));
}

export async function fetchVideoDelta(accessToken, deltaLink, onProgress) {
  if (!deltaLink) {
    throw new Error("缺少 deltaLink，無法執行增量同步。");
  }

  const result = await fetchDeltaPages(accessToken, decorateDeltaUrl(deltaLink), onProgress);
  const changedVideos = [];
  const deletedIds = [];

  for (const item of result.items) {
    if (item?.deleted) {
      if (item?.id) deletedIds.push(String(item.id));
      continue;
    }
    if (!isAcceptedVideo(item)) continue;
    changedVideos.push(toTrack(item));
  }

  return {
    changedVideos,
    deletedIds,
    deltaLink: result.deltaLink,
  };
}

export async function fetchFolderMarker(accessToken, options = {}) {
  const endpoint = String(options.childrenEndpoint || APP_CONFIG.graph.childrenEndpoint);
  const root = tryParseRootFromChildrenEndpoint(endpoint);
  let url = "";
  if (root) {
    const { driveId, itemId } = root;
    url = `https://graph.microsoft.com/v1.0/drives/${strictEncodePathSegment(
      driveId
    )}/items/${strictEncodePathSegment(itemId)}?$select=id,lastModifiedDateTime,cTag`;
  } else {
    const itemUrl = getRootItemUrlFromChildrenEndpoint(endpoint);
    url = `${itemUrl}?$select=id,lastModifiedDateTime,cTag`;
  }
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  if (!res.ok) {
    throw await toGraphError("讀取資料夾 marker 失敗", res);
  }
  const data = await res.json();
  return {
    rootId: data.id ? String(data.id) : null,
    latestModifiedAt: data.lastModifiedDateTime || null,
    cTag: data.cTag || null,
  };
}

export async function hydrateTrackStreamUrl(accessToken, track, options = {}) {
  const { force = false, childrenEndpoint = APP_CONFIG.graph.childrenEndpoint } = options;
  if (!force && hasUsableStreamUrl(track)) return track;
  if (!track?.id) return track;

  const root = tryParseRootFromChildrenEndpoint(childrenEndpoint);
  const fallbackDriveId = root?.driveId || null;
  const driveId = track.driveId || fallbackDriveId;
  const url = driveId
    ? `https://graph.microsoft.com/v1.0/drives/${strictEncodePathSegment(
        driveId
      )}/items/${strictEncodePathSegment(track.id)}`
    : `https://graph.microsoft.com/v1.0/me/drive/items/${strictEncodePathSegment(track.id)}`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  if (!res.ok) {
    throw await toGraphError("取得影片播放連結失敗", res);
  }

  const data = await res.json();
  return {
    ...track,
    name: data.name || track.name,
    webUrl: data.webUrl || track.webUrl || "",
    streamUrl: data["@microsoft.graph.downloadUrl"] || "",
    streamUrlExpiresAt: inferStreamUrlExpiresAt(data["@microsoft.graph.downloadUrl"]),
    thumbnailUrl: track.thumbnailUrl || "",
    durationMs: normalizeDurationMs(data?.video?.duration) ?? track.durationMs ?? null,
    sizeBytes: normalizeSizeBytes(data?.size) ?? track.sizeBytes ?? null,
    modifiedAt: data.lastModifiedDateTime || track.modifiedAt || null,
    driveId,
  };
}

export async function fetchLatestThumbnailUrl(accessToken, track, options = {}) {
  const { childrenEndpoint = APP_CONFIG.graph.childrenEndpoint } = options;
  if (!track?.id) return "";

  const root = tryParseRootFromChildrenEndpoint(childrenEndpoint);
  const fallbackDriveId = root?.driveId || null;
  const driveId = track.driveId || fallbackDriveId;
  const baseUrl = driveId
    ? `https://graph.microsoft.com/v1.0/drives/${strictEncodePathSegment(
        driveId
      )}/items/${strictEncodePathSegment(track.id)}`
    : `https://graph.microsoft.com/v1.0/me/drive/items/${strictEncodePathSegment(track.id)}`;
  const url = `${baseUrl}?$select=id&$expand=thumbnails`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  if (!res.ok) {
    throw await toGraphError("取得最新縮圖失敗", res);
  }

  const data = await res.json();
  return (
    data?.thumbnails?.[0]?.large?.url ||
    data?.thumbnails?.[0]?.medium?.url ||
    data?.thumbnails?.[0]?.small?.url ||
    ""
  );
}

export function computeLatest(tracks) {
  if (!Array.isArray(tracks) || tracks.length === 0) {
    return { latestModifiedAt: null, latestItemId: null };
  }

  let latest = null;
  for (const track of tracks) {
    if (!track.modifiedAt) continue;
    if (!latest || track.modifiedAt > latest.modifiedAt) {
      latest = { id: track.id, modifiedAt: track.modifiedAt };
    }
  }

  if (!latest) return { latestModifiedAt: null, latestItemId: null };
  return {
    latestModifiedAt: latest.modifiedAt,
    latestItemId: latest.id,
  };
}

async function fetchDeltaPages(accessToken, startUrl, onProgress) {
  let url = startUrl;
  let pages = 0;
  let itemsRead = 0;
  let deltaLink = null;
  const allItems = [];
  const seenUrls = new Set();

  while (url) {
    if (seenUrls.has(url)) {
      throw new Error("偵測到重複分頁連結（nextLink loop），已中止同步。");
    }
    seenUrls.add(url);
    if (pages >= MAX_PAGE_FETCH) {
      throw new Error(`分頁超過上限 ${MAX_PAGE_FETCH}，已中止同步。`);
    }

    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!res.ok) {
      throw await toGraphError("Graph 讀取失敗", res);
    }

    const data = await res.json();
    const value = Array.isArray(data.value) ? data.value : [];
    allItems.push(...value);

    pages += 1;
    itemsRead += value.length;
    onProgress?.({
      pages,
      itemsRead,
      message: `已讀取 ${pages} 頁 / ${itemsRead} 筆`,
    });

    url = data["@odata.nextLink"] || null;
    deltaLink = data["@odata.deltaLink"] || deltaLink;
  }

  if (!deltaLink) {
    throw new Error("未取得 Graph deltaLink，無法保存同步狀態。");
  }

  return {
    items: allItems,
    deltaLink,
  };
}

async function fetchAllPages(startUrl, accessToken, onProgress) {
  let url = startUrl;
  let pages = 0;
  let itemsRead = 0;
  const allItems = [];
  const seenUrls = new Set();

  while (url) {
    if (seenUrls.has(url)) {
      throw new Error("偵測到重複分頁連結（nextLink loop），已中止同步。");
    }
    seenUrls.add(url);
    if (pages >= MAX_PAGE_FETCH) {
      throw new Error(`分頁超過上限 ${MAX_PAGE_FETCH}，已中止同步。`);
    }

    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    if (!res.ok) {
      throw await toGraphError("Graph 讀取失敗", res);
    }

    const data = await res.json();
    const value = Array.isArray(data.value) ? data.value : [];
    allItems.push(...value);
    pages += 1;
    itemsRead += value.length;
    onProgress?.({
      pages,
      itemsRead,
      message: `已讀取 ${pages} 頁 / ${itemsRead} 筆`,
    });
    url = data["@odata.nextLink"] || null;
  }

  return allItems;
}

function parseRootFromChildrenEndpoint(endpoint) {
  const value = String(endpoint || "");
  const m = value.match(/\/drives\/([^/]+)\/items\/([^/]+)\/children/i);
  if (!m) {
    throw new Error("childrenEndpoint 格式不正確，無法解析 driveId/itemId。");
  }
  return {
    driveId: decodeURIComponent(m[1]),
    itemId: decodeURIComponent(m[2]),
  };
}

function tryParseRootFromChildrenEndpoint(endpoint) {
  try {
    return parseRootFromChildrenEndpoint(endpoint);
  } catch {
    return null;
  }
}

function buildDeltaStartUrl(driveId, itemId) {
  return `https://graph.microsoft.com/v1.0/drives/${strictEncodePathSegment(
    driveId
  )}/items/${strictEncodePathSegment(itemId)}/delta`;
}

function decorateDeltaUrl(url) {
  const raw = String(url || "").trim();
  if (!raw) return raw;
  const parsed = new URL(raw);
  if (!parsed.searchParams.has("$select")) {
    parsed.searchParams.set(
      "$select",
      "id,name,webUrl,lastModifiedDateTime,size,file,video,parentReference"
    );
  }
  return parsed.toString();
}

function toTracksFromItems(items, fallbackDriveId = null) {
  const map = new Map();
  for (const item of items) {
    if (!isAcceptedVideo(item)) continue;
    const track = toTrack(item, fallbackDriveId);
    map.set(track.id, track);
  }
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name, "zh-Hant"));
}

function isAcceptedVideo(item) {
  if (!item || !item.name || !item.file) return false;
  const lower = item.name.toLowerCase();
  return APP_CONFIG.graph.acceptedExt.some((ext) => lower.endsWith(ext));
}

function toTrack(item, fallbackDriveId = null) {
  const streamUrl = item["@microsoft.graph.downloadUrl"] || "";
  return {
    id: String(item.id),
    name: item.name || "",
    webUrl: item.webUrl || "",
    streamUrl,
    streamUrlExpiresAt: inferStreamUrlExpiresAt(streamUrl),
    thumbnailUrl: item?.thumbnails?.[0]?.small?.url || "",
    durationMs: normalizeDurationMs(item?.video?.duration),
    sizeBytes: normalizeSizeBytes(item?.size),
    source: "cloud",
    modifiedAt: item.lastModifiedDateTime || null,
    driveId: item?.parentReference?.driveId || fallbackDriveId,
  };
}

function normalizeDurationMs(value) {
  const num = Number(value);
  return Number.isFinite(num) && num > 0 ? Math.round(num) : null;
}

function normalizeSizeBytes(value) {
  const num = Number(value);
  return Number.isFinite(num) && num >= 0 ? Math.round(num) : null;
}

function hasUsableStreamUrl(track) {
  if (!track?.streamUrl) return false;
  if (isInvalidPlayableUrl(track.streamUrl)) return false;
  if (!track?.streamUrlExpiresAt) return true;
  const expiresAt = Date.parse(track.streamUrlExpiresAt);
  if (Number.isNaN(expiresAt)) return false;
  return expiresAt - STREAM_URL_REFRESH_SKEW_MS > Date.now();
}

function isInvalidPlayableUrl(url) {
  const raw = String(url || "").toLowerCase();
  if (!raw) return false;
  return raw.includes("/transform/thumbnail") || (raw.includes("width=96") && raw.includes("height=96"));
}

function inferStreamUrlExpiresAt(streamUrl) {
  if (!streamUrl) return null;

  try {
    const url = new URL(streamUrl);
    const candidates = [
      url.searchParams.get("exp"),
      url.searchParams.get("expires"),
      url.searchParams.get("expiry"),
      url.searchParams.get("se"),
    ].filter(Boolean);

    for (const value of candidates) {
      const parsed = parseExpiryValue(value);
      if (parsed) return parsed;
    }
  } catch {
    // ignore malformed URLs and fall back to a conservative TTL
  }

  return new Date(Date.now() + DOWNLOAD_URL_FALLBACK_TTL_MS).toISOString();
}

function parseExpiryValue(value) {
  const raw = String(value || "").trim();
  if (!raw) return null;

  const numeric = Number(raw);
  if (Number.isFinite(numeric)) {
    const epochMs = numeric > 1e12 ? numeric : numeric * 1000;
    return new Date(epochMs).toISOString();
  }

  const isoMs = Date.parse(raw);
  if (!Number.isNaN(isoMs)) {
    return new Date(isoMs).toISOString();
  }

  return null;
}

function buildChildrenUrl(item, fallbackDriveId, endpoint) {
  const driveId = item?.parentReference?.driveId || fallbackDriveId;
  const itemId = item?.id;
  if (!driveId || !itemId) return getRootChildrenUrl(endpoint);
  return decorateChildrenUrl(`https://graph.microsoft.com/v1.0/drives/${strictEncodePathSegment(
    driveId
  )}/items/${strictEncodePathSegment(itemId)}/children`);
}

function getRootChildrenUrl(endpoint = APP_CONFIG.graph.childrenEndpoint) {
  return decorateChildrenUrl(String(endpoint || "").trim());
}

function getRootItemUrlFromChildrenEndpoint(endpoint = APP_CONFIG.graph.childrenEndpoint) {
  const children = getRootChildrenUrl(endpoint);
  if (children.endsWith("/children")) {
    return children.slice(0, -"/children".length);
  }
  throw new Error("childrenEndpoint 必須以 /children 結尾。");
}

function strictEncodePathSegment(value) {
  return encodeURIComponent(String(value)).replace(/[!'()*]/g, (c) =>
    `%${c.charCodeAt(0).toString(16).toUpperCase()}`
  );
}

function decorateChildrenUrl(url) {
  const raw = String(url || "").trim();
  if (!raw) return raw;
  const parsed = new URL(raw);
  if (!parsed.searchParams.has("$select")) {
    parsed.searchParams.set(
      "$select",
      "id,name,webUrl,lastModifiedDateTime,size,file,video,parentReference"
    );
  }
  if (!parsed.searchParams.has("$expand")) {
    parsed.searchParams.set("$expand", "thumbnails");
  }
  return parsed.toString();
}

async function toGraphError(prefix, response) {
  let detail = "";
  try {
    const body = await response.json();
    const code = body?.error?.code || "";
    const msg = body?.error?.message || "";
    if (code || msg) {
      detail = ` | ${code}: ${msg}`;
    }
  } catch {
    // ignore parse errors
  }
  return new Error(`${prefix}: ${response.status} ${response.statusText}${detail}`);
}




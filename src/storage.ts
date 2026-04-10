import { APP_CONFIG } from "./config.js";

const CLOUD_CACHE_VERSION = 2;
const DEFAULT_SOURCE_ID = "onedrive-default";

function createEmptyCloudCache() {
  return {
    tracks: [],
    deltaLink: null,
    latestModifiedAt: null,
    latestItemId: null,
    folderCTag: null,
    lastSyncedAt: null,
    version: CLOUD_CACHE_VERSION,
  };
}

const defaultState = {
  prefs: {
    shuffle: false,
    repeatMode: "off",
    volume: 0.8,
    muted: false,
    playbackRate: 1,
    listViewMode: {
      cloud: "thumb",
      custom: "thumb",
      queue: "thumb",
    },
    listSort: {
      cloud: { field: "name", direction: "asc" },
      custom: { field: "name", direction: "asc" },
      queue: { field: "name", direction: "asc" },
    },
    hotkeysEnabled: true,
    hotkeys: {
      playPause: "Space",
      seekBack: "Alt+ArrowLeft",
      seekForward: "Alt+ArrowRight",
      prevTrack: "Ctrl+Alt+ArrowUp",
      nextTrack: "Ctrl+Alt+ArrowDown",
      toggleMute: "KeyM",
      toggleShuffle: "KeyS",
      cycleRepeat: "KeyR",
      toggleQueue: "KeyQ",
      toggleFullscreen: "KeyF",
    },
  },
  playback: {
    source: "cloud",
    currentId: null,
    currentTime: 0,
  },
  custom: {
    selectedListId: "default",
    activeListId: "cloud",
    lists: [
      {
        id: "default",
        name: "我的清單",
        tracks: [],
      },
    ],
  },
  sources: {
    activeSourceId: DEFAULT_SOURCE_ID,
    items: [
      {
        id: DEFAULT_SOURCE_ID,
        name: "OneDrive",
        type: "onedrive",
        isDefault: true,
        childrenEndpoint: APP_CONFIG.graph.childrenEndpoint,
      },
    ],
    onedriveCaches: {
      [DEFAULT_SOURCE_ID]: createEmptyCloudCache(),
    },
    localSources: {},
  },
};

export function loadState() {
  try {
    const raw = localStorage.getItem(APP_CONFIG.storageKey);
    if (!raw) return structuredClone(defaultState);
    const parsed = JSON.parse(raw);
    return mergeDefaults(parsed);
  } catch {
    return structuredClone(defaultState);
  }
}

export function saveState(state) {
  localStorage.setItem(APP_CONFIG.storageKey, JSON.stringify(state));
}

function mergeDefaults(input) {
  return {
    prefs: {
      ...defaultState.prefs,
      ...(input?.prefs || {}),
      listViewMode: normalizeListViewMode(input?.prefs?.listViewMode),
      listSort: normalizeListSort(input?.prefs?.listSort),
      hotkeys: {
        ...defaultState.prefs.hotkeys,
        ...(input?.prefs?.hotkeys || {}),
      },
    },
    playback: { ...defaultState.playback, ...(input?.playback || {}) },
    custom: {
      selectedListId:
        input?.custom?.selectedListId || defaultState.custom.selectedListId,
      activeListId: input?.custom?.activeListId || defaultState.custom.activeListId,
      lists: normalizeLists(input?.custom?.lists),
    },
    sources: normalizeSources(input),
  };
}

export { CLOUD_CACHE_VERSION };
export { DEFAULT_SOURCE_ID };

function normalizeListViewMode(value) {
  if (value && typeof value === "object") {
    return {
      cloud: value.cloud === "text" ? "text" : "thumb",
      custom: value.custom === "text" ? "text" : "thumb",
      queue: value.queue === "text" ? "text" : "thumb",
    };
  }
  const mode = value === "text" ? "text" : "thumb";
  return {
    cloud: mode,
    custom: mode,
    queue: mode,
  };
}

function normalizeListSort(value) {
  const fallback = defaultState.prefs.listSort;
  const normalizeEntry = (entry, key) => ({
    field: ["name", "modifiedAt", "sizeBytes"].includes(entry?.field) ? entry.field : fallback[key].field,
    direction: entry?.direction === "desc" ? "desc" : "asc",
  });

  if (value && typeof value === "object") {
    return {
      cloud: normalizeEntry(value.cloud, "cloud"),
      custom: normalizeEntry(value.custom, "custom"),
      queue: normalizeEntry(value.queue, "queue"),
    };
  }

  return structuredClone(fallback);
}

function normalizeLists(lists) {
  if (!Array.isArray(lists) || lists.length === 0) {
    return structuredClone(defaultState.custom.lists);
  }

  const cleaned = lists
    .filter((item) => item && item.id && item.name)
    .map((item) => ({
      id: String(item.id),
      name: String(item.name),
      tracks: normalizeCloudTracks(item.tracks),
      trackIds: Array.isArray(item.trackIds) ? item.trackIds.map(String) : [],
    }));

  return cleaned.length > 0 ? cleaned : structuredClone(defaultState.custom.lists);
}

function normalizeCloudTracks(tracks) {
  if (!Array.isArray(tracks)) return [];
  return tracks
    .filter((item) => item && item.id && item.name)
    .map((item) => ({
      id: String(item.id),
      name: String(item.name),
      webUrl: String(item.webUrl || ""),
      streamUrl: String(item.streamUrl || ""),
      streamUrlExpiresAt: item.streamUrlExpiresAt ? String(item.streamUrlExpiresAt) : null,
      thumbnailUrl: String(item.thumbnailUrl || ""),
      durationMs: Number.isFinite(Number(item.durationMs)) ? Math.round(Number(item.durationMs)) : null,
      sizeBytes: Number.isFinite(Number(item.sizeBytes)) ? Math.round(Number(item.sizeBytes)) : null,
      source: "cloud",
      sourceType: item.sourceType === "local" ? "local" : "onedrive",
      sourceId: item.sourceId ? String(item.sourceId) : null,
      modifiedAt: item.modifiedAt ? String(item.modifiedAt) : null,
      driveId: item.driveId ? String(item.driveId) : null,
      localSourceId: item.localSourceId ? String(item.localSourceId) : null,
      localFileId: item.localFileId ? String(item.localFileId) : null,
    }));
}

function normalizeCloudCache(cache) {
  return {
    tracks: normalizeCloudTracks(cache?.tracks),
    deltaLink: cache?.deltaLink || null,
    latestModifiedAt: cache?.latestModifiedAt || null,
    latestItemId: cache?.latestItemId || null,
    folderCTag: cache?.folderCTag || null,
    lastSyncedAt: cache?.lastSyncedAt || null,
    version: Number.isFinite(Number(cache?.version))
      ? Number(cache.version)
      : CLOUD_CACHE_VERSION,
  };
}

function normalizeSources(input) {
  const fallback = structuredClone(defaultState.sources);
  const incoming = input?.sources && typeof input.sources === "object" ? input.sources : {};

  const rawItems = Array.isArray(incoming.items) && incoming.items.length > 0 ? incoming.items : fallback.items;
  const seen = new Set();
  const items = rawItems
    .filter((source) => source && source.id && source.name && source.type)
    .map((source) => ({
      id: String(source.id),
      name: String(source.name),
      type: source.type === "local" ? "local" : "onedrive",
      isDefault: Boolean(source.isDefault),
      childrenEndpoint:
        source.type === "onedrive"
          ? String(source.childrenEndpoint || APP_CONFIG.graph.childrenEndpoint)
          : null,
      recursive: Boolean(source.recursive),
    }))
    .filter((source) => {
      if (seen.has(source.id)) return false;
      seen.add(source.id);
      return true;
    });

  if (!items.some((source) => source.id === DEFAULT_SOURCE_ID)) {
    items.unshift({
      id: DEFAULT_SOURCE_ID,
      name: "OneDrive",
      type: "onedrive",
      isDefault: true,
      childrenEndpoint: APP_CONFIG.graph.childrenEndpoint,
      recursive: false,
    });
  }

  const activeSourceId = items.some((source) => source.id === incoming.activeSourceId)
    ? String(incoming.activeSourceId)
    : DEFAULT_SOURCE_ID;

  const onedriveCaches = {};
  const inputCaches = incoming.onedriveCaches && typeof incoming.onedriveCaches === "object"
    ? incoming.onedriveCaches
    : {};

  const legacyCloudCache = input?.cloudCache ? normalizeCloudCache(input.cloudCache) : null;
  for (const source of items) {
    if (source.type !== "onedrive") continue;
    if (source.id === DEFAULT_SOURCE_ID && legacyCloudCache) {
      onedriveCaches[source.id] = legacyCloudCache;
      continue;
    }
    onedriveCaches[source.id] = normalizeCloudCache(inputCaches[source.id] || createEmptyCloudCache());
  }

  const localSources = {};
  const inputLocal = incoming.localSources && typeof incoming.localSources === "object" ? incoming.localSources : {};
  for (const source of items) {
    if (source.type !== "local") continue;
    const localData = inputLocal[source.id] || {};
    localSources[source.id] = {
      tracks: normalizeCloudTracks(localData.tracks),
      acceptedExt: Array.isArray(localData.acceptedExt) && localData.acceptedExt.length > 0
        ? localData.acceptedExt.map((ext) => String(ext).toLowerCase())
        : [".mp4"],
      lastImportedAt: localData.lastImportedAt ? String(localData.lastImportedAt) : null,
      recursive: Boolean(localData.recursive),
      importMode: localData.importMode === "folder" ? "folder" : "files",
    };
  }

  return {
    activeSourceId,
    items,
    onedriveCaches,
    localSources,
  };
}

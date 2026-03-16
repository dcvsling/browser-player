import { APP_CONFIG } from "./config.js";

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
        trackIds: [],
      },
    ],
  },
  cloudCache: {
    tracks: [],
    deltaLink: null,
    latestModifiedAt: null,
    latestItemId: null,
    folderCTag: null,
    lastSyncedAt: null,
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
    cloudCache: {
      tracks: normalizeCloudTracks(input?.cloudCache?.tracks),
      deltaLink: input?.cloudCache?.deltaLink || null,
      latestModifiedAt: input?.cloudCache?.latestModifiedAt || null,
      latestItemId: input?.cloudCache?.latestItemId || null,
      folderCTag: input?.cloudCache?.folderCTag || null,
      lastSyncedAt: input?.cloudCache?.lastSyncedAt || null,
    },
  };
}

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
      modifiedAt: item.modifiedAt ? String(item.modifiedAt) : null,
      driveId: item.driveId ? String(item.driveId) : null,
    }));
}

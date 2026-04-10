// @ts-nocheck
import { APP_CONFIG } from "./config.js";
import { initAuth, login, logout, getAccessToken, getAccount } from "./auth.js";
import {
  fetchAllVideosViaDelta,
  fetchAllVideosViaChildren,
  fetchVideoDelta,
  fetchFolderMarker,
  computeLatest,
  hydrateTrackStreamUrl,
} from "./graph.js";
import { PlaylistController } from "./playlist.js";
import { Player } from "./player.js";
import {
  buildAppUrl,
  detectAppBasePath,
  normalizeRoute,
  resolveCurrentRoute,
  restoreGithubPagesRoute,
} from "./routing.js";
import { CLOUD_CACHE_VERSION, DEFAULT_SOURCE_ID, loadState, saveState } from "./storage.js";
import { buildLocalSourceTracks } from "./local-media.js";
import {
  loadLocalRuntimeFile,
  removeLocalRuntimeFilesBySource,
  saveLocalRuntimeFile,
} from "./local-runtime-cache.js";
import { SourceAccessOrchestrator } from "./source-access.js";
import { SourceManager } from "./source-manager.js";

const state = loadState();
const DEFAULT_HOTKEYS = {
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
};

let cloudTracks = [];
let isSyncing = false;
let currentRoute = "/player";
let queueOpen = false;
let isRecoveringSource = false;
let lastRecoveryAt = 0;
let isScrubbing = false;
let capturingShortcutAction = null;
let fullscreenControlsTimer = 0;
let deferredInstallPrompt = null;
let pwaUpdatePromptOpen = false;
let pwaControllerChanged = false;
let isMobileLayout = window.matchMedia("(max-width: 900px)").matches;
let mobilePlayerChromeVisible = false;
let mobileCloudToolsVisible = false;
let mobileCustomToolsVisible = false;
let pendingLocalFiles = [];
let pendingLocalImportMode = "files";
let openSourceModal = null;
const appBasePath = detectAppBasePath(window.location.pathname);

const dom = {
  appTitle: document.getElementById("appTitle"),
  navPlayerBtn: document.getElementById("navPlayerBtn"),
  navPlaylistBtn: document.getElementById("navPlaylistBtn"),
  navSettingsBtn: document.getElementById("navSettingsBtn"),
  installAppBtn: document.getElementById("installAppBtn"),
  mobileMenuBtn: document.getElementById("mobileMenuBtn"),
  accountBadge: document.getElementById("accountBadge"),
  accountAvatar: document.getElementById("accountAvatar"),
  accountFallback: document.getElementById("accountFallback"),
  accountLabel: document.getElementById("accountLabel"),
  loginBtn: document.getElementById("loginBtn"),
  logoutBtn: document.getElementById("logoutBtn"),
  refreshBtn: document.getElementById("refreshBtn"),
  sourceSelect: document.getElementById("sourceSelect"),
  cloudSortFieldSelect: document.getElementById("cloudSortFieldSelect"),
  cloudSortDirectionBtn: document.getElementById("cloudSortDirectionBtn"),
  cloudViewModeBtn: document.getElementById("cloudViewModeBtn"),
  cloudMobileToolsBtn: document.getElementById("cloudMobileToolsBtn"),
  cloudList: document.getElementById("cloudList"),
  customListSelect: document.getElementById("customListSelect"),
  customSortFieldSelect: document.getElementById("customSortFieldSelect"),
  customSortDirectionBtn: document.getElementById("customSortDirectionBtn"),
  customTracks: document.getElementById("customTracks"),
  customViewModeBtn: document.getElementById("customViewModeBtn"),
  customMobileToolsBtn: document.getElementById("customMobileToolsBtn"),
  newListBtn: document.getElementById("newListBtn"),
  deleteListBtn: document.getElementById("deleteListBtn"),
  setActiveListBtn: document.getElementById("setActiveListBtn"),
  video: document.getElementById("video"),
  nowPlaying: document.getElementById("nowPlaying"),
  inlineLoading: document.getElementById("inlineLoading"),
  progressInput: document.getElementById("progressInput"),
  playbackTime: document.getElementById("playbackTime"),
  queueToggleBtn: document.getElementById("queueToggleBtn"),
  queueCloseBtn: document.getElementById("queueCloseBtn"),
  queueSortFieldSelect: document.getElementById("queueSortFieldSelect"),
  queueSortDirectionBtn: document.getElementById("queueSortDirectionBtn"),
  queueViewModeBtn: document.getElementById("queueViewModeBtn"),
  queueDrawer: document.getElementById("queueDrawer"),
  playQueueList: document.getElementById("playQueueList"),
  prevBtn: document.getElementById("prevBtn"),
  rewindBtn: document.getElementById("rewindBtn"),
  playBtn: document.getElementById("playBtn"),
  forwardBtn: document.getElementById("forwardBtn"),
  nextBtn: document.getElementById("nextBtn"),
  fullscreenBtn: document.getElementById("fullscreenBtn"),
  shuffleBtn: document.getElementById("shuffleBtn"),
  repeatBtn: document.getElementById("repeatBtn"),
  volumeInput: document.getElementById("volumeInput"),
  muteBtn: document.getElementById("muteBtn"),
  speedSelect: document.getElementById("speedSelect"),
  hotkeysToggle: document.getElementById("hotkeysToggle"),
  resetHotkeysBtn: document.getElementById("resetHotkeysBtn"),
  loadingOverlay: document.getElementById("loadingOverlay"),
  loadingText: document.getElementById("loadingText"),
  syncInfo: document.getElementById("syncInfo"),
  activeListLabel: document.getElementById("activeListLabel"),
  editingListLabel: document.getElementById("editingListLabel"),
  playerPanel: document.getElementById("playerPanel"),
  libraryPanel: document.getElementById("libraryPanel"),
  customPanel: document.getElementById("customPanel"),
  settingsPanel: document.getElementById("settingsPanel"),
  sourceManageSelect: document.getElementById("sourceManageSelect"),
  deleteSourceBtn: document.getElementById("deleteSourceBtn"),
  openOnedriveSourceModalBtn: document.getElementById("openOnedriveSourceModalBtn"),
  openLocalSourceModalBtn: document.getElementById("openLocalSourceModalBtn"),
  onedriveSourceModal: document.getElementById("onedriveSourceModal"),
  cancelOnedriveSourceBtn: document.getElementById("cancelOnedriveSourceBtn"),
  onedriveSourceError: document.getElementById("onedriveSourceError"),
  newOnedriveNameInput: document.getElementById("newOnedriveNameInput"),
  newOnedriveUrlInput: document.getElementById("newOnedriveUrlInput"),
  addOnedriveSourceBtn: document.getElementById("addOnedriveSourceBtn"),
  localSourceModal: document.getElementById("localSourceModal"),
  cancelLocalSourceBtn: document.getElementById("cancelLocalSourceBtn"),
  localSourceError: document.getElementById("localSourceError"),
  newLocalNameInput: document.getElementById("newLocalNameInput"),
  localRecursiveToggle: document.getElementById("localRecursiveToggle"),
  pickLocalFilesBtn: document.getElementById("pickLocalFilesBtn"),
  pickLocalFolderBtn: document.getElementById("pickLocalFolderBtn"),
  addLocalSourceBtn: document.getElementById("addLocalSourceBtn"),
  localSelectionInfo: document.getElementById("localSelectionInfo"),
  localFilesInput: document.getElementById("localFilesInput"),
  localFolderInput: document.getElementById("localFolderInput"),
  shortcutInputs: {
    playPause: document.getElementById("shortcut-playPause"),
    seekBack: document.getElementById("shortcut-seekBack"),
    seekForward: document.getElementById("shortcut-seekForward"),
    prevTrack: document.getElementById("shortcut-prevTrack"),
    nextTrack: document.getElementById("shortcut-nextTrack"),
    toggleMute: document.getElementById("shortcut-toggleMute"),
    toggleShuffle: document.getElementById("shortcut-toggleShuffle"),
    cycleRepeat: document.getElementById("shortcut-cycleRepeat"),
    toggleQueue: document.getElementById("shortcut-toggleQueue"),
    toggleFullscreen: document.getElementById("shortcut-toggleFullscreen"),
  },
};

const playlist = new PlaylistController();
const player = new Player(dom.video, dom.playerPanel);
const sourceManager = new SourceManager({
  state,
  appConfig: APP_CONFIG,
  defaultSourceId: DEFAULT_SOURCE_ID,
  cloudCacheVersion: CLOUD_CACHE_VERSION,
});
const legacyCacheNamePatterns = [
  "browser-player",
  "workbox",
  "precache",
  "vite-pwa",
  "sw-cache",
];

const sourceAccess = new SourceAccessOrchestrator({
  getAccessToken,
  hydrateTrackStreamUrl,
  getLocalRuntimeFile: async (sourceId, fileId) => {
    const cached = sourceManager.getRuntimeFile(sourceId, fileId);
    if (cached) return cached;
    const persisted = await loadLocalRuntimeFile(sourceId, fileId);
    if (persisted) {
      sourceManager.setRuntimeFile(sourceId, fileId, persisted);
    }
    return persisted;
  },
});

function createEmptyCloudCache() {
  return sourceManager.createEmptyCloudCache();
}

function ensureSourceState() {
  sourceManager.ensureState();
}

function getSources() {
  return sourceManager.getSources();
}

function getActiveSource() {
  return sourceManager.getActiveSource();
}

function getCloudCacheForSource(sourceId) {
  return sourceManager.getCloudCacheForSource(sourceId);
}

function getLocalDataForSource(sourceId) {
  return sourceManager.getLocalDataForSource(sourceId);
}

function getActiveCloudCache() {
  return sourceManager.getActiveCloudCache();
}

function withTrackSourceMetadata(track, source) {
  if (!track || !source) return track;
  const next = { ...track };
  next.source = source.type === "local" ? "local" : "cloud";
  next.sourceType = source.type;
  next.sourceId = source.id;
  if (source.type === "local") {
    next.localSourceId = track.localSourceId || source.id;
    next.streamUrl = "";
    next.streamUrlExpiresAt = null;
  }
  return next;
}

function applySourceMetadataToTracks(tracks, source = getActiveSource()) {
  if (!Array.isArray(tracks)) return [];
  if (!source) return [...tracks];
  return tracks.map((track) => withTrackSourceMetadata(track, source));
}

function rebuildActiveTracksFromSource() {
  cloudTracks = applySourceMetadataToTracks(sourceManager.rebuildActiveTracksFromSource());
}

ensureSourceState();
rebuildActiveTracksFromSource();

function getWaitingTitle() {
  return "等待播放";
}

function getPlaybackTitle() {
  const active = String(dom.nowPlaying?.textContent || "").trim();
  return active && active !== "尚未選擇影片" ? `正在播放：${active}` : getWaitingTitle();
}

function updateAppTitle() {
  let title = getWaitingTitle();
  if (currentRoute === "/player") {
    title = getPlaybackTitle();
  } else if (currentRoute === "/playlist") {
    title = "播放清單";
  } else if (currentRoute === "/settings") {
    title = "設定";
  }
  if (dom.appTitle) {
    dom.appTitle.textContent = title;
  }
  document.title = title;
  document
    .querySelector('meta[name="apple-mobile-web-app-title"]')
    ?.setAttribute("content", title);
}

function setMobilePlayerChromeVisible(visible) {
  mobilePlayerChromeVisible = Boolean(visible) && isMobileLayout && currentRoute === "/player";
  document.body.classList.toggle("mobile-player-chrome-visible", mobilePlayerChromeVisible);
  if (dom.mobileMenuBtn) {
    dom.mobileMenuBtn.setAttribute("aria-expanded", String(mobilePlayerChromeVisible));
  }
}

function syncMobilePlaylistToolsVisibility() {
  const showCloud = Boolean(mobileCloudToolsVisible) && isMobileLayout && currentRoute === "/playlist";
  const showCustom = Boolean(mobileCustomToolsVisible) && isMobileLayout && currentRoute === "/playlist";
  dom.libraryPanel.classList.toggle("mobile-tools-open", showCloud);
  dom.customPanel.classList.toggle("mobile-tools-open", showCustom);
  if (dom.cloudMobileToolsBtn) {
    dom.cloudMobileToolsBtn.setAttribute("aria-expanded", String(showCloud));
  }
  if (dom.customMobileToolsBtn) {
    dom.customMobileToolsBtn.setAttribute("aria-expanded", String(showCustom));
  }
}

function applyMobileLayoutState() {
  isMobileLayout = window.matchMedia("(max-width: 900px)").matches;
  document.body.classList.toggle("mobile-layout", isMobileLayout);
  if (!isMobileLayout) {
    setMobilePlayerChromeVisible(false);
    mobileCloudToolsVisible = false;
    mobileCustomToolsVisible = false;
    syncMobilePlaylistToolsVisibility();
    return;
  }
  if (currentRoute === "/settings") {
    updateRoute("/player", true);
    return;
  }
  if (currentRoute !== "/player") {
    setMobilePlayerChromeVisible(false);
  } else {
    document.body.classList.toggle("mobile-player-chrome-visible", mobilePlayerChromeVisible);
  }
  syncMobilePlaylistToolsVisibility();
}

function getListViewMode(target) {
  return state.prefs.listViewMode?.[target] === "text" ? "text" : "thumb";
}

function getListSort(target) {
  const fallback = { field: "name", direction: "asc" };
  const sort = state.prefs.listSort?.[target];
  return {
    field: ["name", "modifiedAt", "sizeBytes"].includes(sort?.field) ? sort.field : fallback.field,
    direction: sort?.direction === "desc" ? "desc" : fallback.direction,
  };
}

function getAppScopePrefix() {
  return `${window.location.origin}${buildAppUrl("/", appBasePath)}`;
}

async function cleanupLegacyOfflineState() {
  const cleanupTasks = [];
  const appScopePrefix = getAppScopePrefix();
  const currentSwSuffix = buildAppUrl("/sw.js", appBasePath);

  if ("serviceWorker" in navigator) {
    cleanupTasks.push(
      navigator.serviceWorker.getRegistrations().then(async (registrations) => {
        await Promise.all(
          registrations
            .filter((registration) => {
              if (!registration.scope.startsWith(appScopePrefix)) return false;
              const scriptUrl =
                registration.active?.scriptURL ||
                registration.waiting?.scriptURL ||
                registration.installing?.scriptURL ||
                "";
              return !scriptUrl.endsWith(currentSwSuffix);
            })
            .map((registration) => registration.unregister())
        );
      })
    );
  }

  if ("caches" in window) {
    cleanupTasks.push(
      caches.keys().then(async (keys) => {
        await Promise.all(
          keys
            .filter((key) =>
              legacyCacheNamePatterns.some((pattern) => key.toLowerCase().includes(pattern))
            )
            .map((key) => caches.delete(key))
        );
      })
    );
  }

  if (cleanupTasks.length === 0) return;

  try {
    await Promise.all(cleanupTasks);
  } catch (error) {
    console.warn("舊版離線快取清理失敗", error);
  }
}

function updateInstallButton() {
  const isInstalled =
    window.matchMedia?.("(display-mode: standalone)")?.matches ||
    window.navigator.standalone === true;
  dom.installAppBtn.classList.toggle("hidden", !deferredInstallPrompt || isInstalled);
}

async function installApp() {
  if (!deferredInstallPrompt) return;
  deferredInstallPrompt.prompt();
  try {
    await deferredInstallPrompt.userChoice;
  } finally {
    deferredInstallPrompt = null;
    updateInstallButton();
  }
}

async function registerPwa() {
  if (!("serviceWorker" in navigator)) return;
  try {
    const registration = await navigator.serviceWorker.register(buildAppUrl("/sw.js", appBasePath), {
      scope: buildAppUrl("/", appBasePath),
    });

    const askToActivateWaitingWorker = (worker) => {
      if (!worker || pwaUpdatePromptOpen) return;
      pwaUpdatePromptOpen = true;
      const shouldUpdateNow = window.confirm("偵測到新版本，是否立即更新？");
      pwaUpdatePromptOpen = false;
      if (shouldUpdateNow) {
        worker.postMessage({ type: "SKIP_WAITING" });
      }
    };

    const promptIfWaiting = () => {
      if (registration.waiting) {
        askToActivateWaitingWorker(registration.waiting);
      }
    };

    promptIfWaiting();

    registration.addEventListener("updatefound", () => {
      const installingWorker = registration.installing;
      if (!installingWorker) return;
      installingWorker.addEventListener("statechange", () => {
        if (installingWorker.state !== "installed") return;
        if (!navigator.serviceWorker.controller) return;
        askToActivateWaitingWorker(registration.waiting || installingWorker);
      });
    });

    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (pwaControllerChanged) return;
      pwaControllerChanged = true;
      window.location.reload();
    });

    window.setInterval(() => {
      registration.update().catch(() => {});
    }, 5 * 60 * 1000);
  } catch (error) {
    console.warn("PWA service worker 註冊失敗", error);
  }
}

function setListSort(target, patch) {
  if (!state.prefs.listSort || typeof state.prefs.listSort !== "object") {
    state.prefs.listSort = {
      cloud: { field: "name", direction: "asc" },
      custom: { field: "name", direction: "asc" },
      queue: { field: "name", direction: "asc" },
    };
  }
  state.prefs.listSort[target] = {
    ...getListSort(target),
    ...patch,
  };
  persistAndRender();
}

function toggleListViewMode(target) {
  if (!state.prefs.listViewMode || typeof state.prefs.listViewMode !== "object") {
    state.prefs.listViewMode = { cloud: "thumb", custom: "thumb", queue: "thumb" };
  }
  state.prefs.listViewMode[target] = getListViewMode(target) === "thumb" ? "text" : "thumb";
  persistAndRender();
}

function sortTracks(target, tracks) {
  const { field, direction } = getListSort(target);
  const factor = direction === "desc" ? -1 : 1;
  return [...tracks].sort((a, b) => {
    let result = 0;
    if (field === "modifiedAt") {
      const aParsed = a?.modifiedAt ? Date.parse(a.modifiedAt) : NaN;
      const bParsed = b?.modifiedAt ? Date.parse(b.modifiedAt) : NaN;
      const aValue = Number.isFinite(aParsed) ? aParsed : -Infinity;
      const bValue = Number.isFinite(bParsed) ? bParsed : -Infinity;
      result = aValue === bValue ? 0 : aValue > bValue ? 1 : -1;
    } else if (field === "sizeBytes") {
      const aValue = Number.isFinite(Number(a?.sizeBytes)) ? Number(a.sizeBytes) : -1;
      const bValue = Number.isFinite(Number(b?.sizeBytes)) ? Number(b.sizeBytes) : -1;
      result = aValue === bValue ? 0 : aValue > bValue ? 1 : -1;
    } else {
      result = String(a?.name || "").localeCompare(String(b?.name || ""), "zh-Hant");
    }
    if (result === 0) {
      result = String(a?.name || "").localeCompare(String(b?.name || ""), "zh-Hant");
    }
    return result * factor;
  });
}

function resetCloudState() {
  const source = getActiveSource();
  cloudTracks = [];
  if (source?.type === "onedrive") {
    getCloudCacheForSource(source.id).tracks = [];
    getCloudCacheForSource(source.id).deltaLink = null;
    getCloudCacheForSource(source.id).latestModifiedAt = null;
    getCloudCacheForSource(source.id).latestItemId = null;
    getCloudCacheForSource(source.id).folderCTag = null;
    getCloudCacheForSource(source.id).lastSyncedAt = null;
    getCloudCacheForSource(source.id).version = CLOUD_CACHE_VERSION;
  } else if (source?.type === "local") {
    const local = getLocalDataForSource(source.id);
    state.sources.localSources[source.id] = {
      ...local,
      tracks: [],
      lastImportedAt: null,
    };
    sourceManager.clearRuntimeFiles(source.id);
    removeLocalRuntimeFilesBySource(source.id).catch(() => {});
  }
  state.playback.currentId = null;
  state.playback.currentTime = 0;
  dom.nowPlaying.textContent = "尚未選擇影片";
  updateAppTitle();
  player.pause();
  dom.video.removeAttribute("src");
  dom.video.load();
  updatePlaybackProgress(0, 0);
}

function normalizeCustomState() {
  if (!Array.isArray(state.custom.lists)) {
    state.custom.lists = [];
  }
  state.custom.lists.forEach((list) => {
    migrateLegacyListTracks(list);
    if (!Array.isArray(list.tracks)) list.tracks = [];
  });

  const hasSelected = state.custom.lists.some((item) => item.id === state.custom.selectedListId);
  if (!hasSelected) {
    state.custom.selectedListId = state.custom.lists[0]?.id || null;
  }

  if (
    state.custom.activeListId !== "cloud" &&
    !state.custom.lists.some((item) => item.id === state.custom.activeListId)
  ) {
    state.custom.activeListId = "cloud";
  }
}

function setQueueOpen(open) {
  queueOpen = Boolean(open);
  dom.queueDrawer.classList.toggle("hidden", !queueOpen);
  dom.queueToggleBtn.setAttribute("aria-expanded", String(queueOpen));
  syncIconButtons();
  revealFullscreenControls();
}

function normalizeShortcut(event) {
  const key = String(event.key || "").trim();
  const code = String(event.code || "").trim();
  if (!key && !code) return null;
  if (["Control", "Alt", "Shift", "Meta"].includes(key)) return null;

  let base = code || key;
  if (key === " " || key === "Spacebar") base = "Space";
  else if (key.length === 1 && code.startsWith("Key")) base = code;
  else if (key.length === 1 && code.startsWith("Digit")) base = code;
  else if (key.length === 1) base = key.toUpperCase();
  else if (key.startsWith("Arrow")) base = key;
  else if (["Home", "End", "PageUp", "PageDown", "Insert", "Delete", "Backspace", "Enter", "Escape", "Tab"].includes(key)) {
    base = key;
  }

  const mods = [];
  if (event.ctrlKey) mods.push("Ctrl");
  if (event.altKey) mods.push("Alt");
  if (event.shiftKey) mods.push("Shift");
  return [...mods, base].join("+");
}

function formatShortcutLabel(value) {
  if (!value) return "";
  return value
    .replace(/Key([A-Z])/g, "$1")
    .replace(/Digit([0-9])/g, "$1")
    .replace(/Arrow/g, "");
}

function syncShortcutInputs() {
  Object.entries(dom.shortcutInputs).forEach(([action, input]) => {
    input.value = formatShortcutLabel(state.prefs.hotkeys?.[action] || "");
    input.classList.toggle("capturing", capturingShortcutAction === action);
    input.placeholder = "按下快捷鍵";
  });
}

function syncIconButtons() {
  setButtonIcon(dom.shuffleBtn, "shuffle");
  dom.shuffleBtn.setAttribute("aria-label", state.prefs.shuffle ? "關閉隨機" : "開啟隨機");
  dom.shuffleBtn.setAttribute("title", state.prefs.shuffle ? "關閉隨機" : "開啟隨機");

  const repeatText =
    state.prefs.repeatMode === "one" ? "單曲循環" : state.prefs.repeatMode === "all" ? "清單循環" : "循環關閉";
  setButtonIcon(dom.repeatBtn, state.prefs.repeatMode === "one" ? "repeat_one" : "repeat");
  dom.repeatBtn.setAttribute("aria-label", repeatText);
  dom.repeatBtn.setAttribute("title", repeatText);

  setButtonIcon(dom.muteBtn, state.prefs.muted ? "volume_off" : "volume_up");
  dom.muteBtn.setAttribute("aria-label", state.prefs.muted ? "取消靜音" : "靜音");
  dom.muteBtn.setAttribute("title", state.prefs.muted ? "取消靜音" : "靜音");

  setButtonIcon(dom.playBtn, dom.video.paused ? "play_arrow" : "pause");
  dom.playBtn.setAttribute("aria-label", dom.video.paused ? "播放" : "暫停");
  setButtonIcon(dom.fullscreenBtn, player.isFullscreen() ? "close_fullscreen" : "open_in_full");
  dom.fullscreenBtn.setAttribute("aria-label", player.isFullscreen() ? "離開全螢幕" : "全螢幕");
  dom.queueToggleBtn.setAttribute("aria-label", queueOpen ? "關閉側邊清單" : "開啟側邊清單");
  setButtonIcon(dom.queueToggleBtn, queueOpen ? "close" : "playlist_play");

  [
    { button: dom.cloudViewModeBtn, target: "cloud" },
    { button: dom.customViewModeBtn, target: "custom" },
    { button: dom.queueViewModeBtn, target: "queue" },
  ].forEach(({ button, target }) => {
    if (!button) return;
    const isThumb = getListViewMode(target) === "thumb";
    setButtonIcon(button, isThumb ? "view_list" : "view_agenda");
    button.setAttribute("aria-label", isThumb ? "切換為文字清單" : "切換為縮圖清單");
    button.setAttribute("title", isThumb ? "切換為文字清單" : "切換為縮圖清單");
  });

  [
    {
      select: dom.cloudSortFieldSelect,
      button: dom.cloudSortDirectionBtn,
      target: "cloud",
      label: "雲端清單",
    },
    {
      select: dom.customSortFieldSelect,
      button: dom.customSortDirectionBtn,
      target: "custom",
      label: "自訂清單",
    },
    {
      select: dom.queueSortFieldSelect,
      button: dom.queueSortDirectionBtn,
      target: "queue",
      label: "播放清單",
    },
  ].forEach(({ select, button, target, label }) => {
    const sort = getListSort(target);
    if (select) {
      select.value = sort.field;
      select.setAttribute("aria-label", `${label}排序欄位`);
    }
    if (button) {
      const isAsc = sort.direction === "asc";
      setButtonIcon(button, isAsc ? "arrow_upward" : "arrow_downward");
      button.setAttribute("aria-label", `${label}${isAsc ? "遞增" : "遞減"}排序`);
      button.setAttribute("title", `${label}${isAsc ? "遞增" : "遞減"}排序`);
    }
  });
}

function setButtonIcon(button, iconName) {
  button.innerHTML = `<span class="material-symbols-rounded" aria-hidden="true">${iconName}</span>`;
}

function revealFullscreenControls() {
  if (!player.isFullscreen()) {
    dom.playerPanel.classList.remove("controls-hidden");
    return;
  }
  dom.playerPanel.classList.remove("controls-hidden");
  window.clearTimeout(fullscreenControlsTimer);
  fullscreenControlsTimer = window.setTimeout(() => {
    if (player.isFullscreen()) {
      dom.playerPanel.classList.add("controls-hidden");
    }
  }, 2400);
}

function updateRoute(route, replace = false) {
  const normalizedRoute = normalizeRoute(route);
  currentRoute = isMobileLayout && normalizedRoute === "/settings" ? "/player" : normalizedRoute;
  const nextUrl = buildAppUrl(currentRoute, appBasePath);
  if (replace) {
    window.history.replaceState({}, "", nextUrl);
  } else if (window.location.pathname !== nextUrl) {
    window.history.pushState({}, "", nextUrl);
  }
  renderRoute();
}

function renderRoute() {
  const isPlayer = currentRoute === "/player";
  const isPlaylist = currentRoute === "/playlist";
  const isSettings = !isMobileLayout && currentRoute === "/settings";
  dom.playerPanel.classList.toggle("hidden", !isPlayer);
  dom.libraryPanel.classList.toggle("hidden", !isPlaylist);
  dom.customPanel.classList.toggle("hidden", !isPlaylist);
  dom.settingsPanel.classList.toggle("hidden", !isSettings);
  if (!isPlayer) setQueueOpen(false);
  if (!isPlayer) setMobilePlayerChromeVisible(false);
  if (!isPlaylist) {
    mobileCloudToolsVisible = false;
    mobileCustomToolsVisible = false;
  }
  syncMobilePlaylistToolsVisibility();

  document.body.classList.toggle("route-player", isPlayer);
  document.body.classList.toggle("route-playlist", isPlaylist);
  document.body.classList.toggle("route-settings", isSettings);

  dom.navPlayerBtn.setAttribute("aria-pressed", String(isPlayer));
  dom.navPlaylistBtn.setAttribute("aria-pressed", String(isPlaylist));
  dom.navSettingsBtn.setAttribute("aria-pressed", String(isSettings));

  if (isPlayer) {
    window.requestAnimationFrame(() => {
      dom.video.focus({ preventScroll: true });
    });
  }
}

function getSelectedList() {
  normalizeCustomState();
  return state.custom.lists.find((item) => item.id === state.custom.selectedListId) || null;
}

function getTrackOriginKey(track) {
  const sourceId = String(track?.sourceId || track?.localSourceId || "");
  const trackId = String(track?.id || "");
  return `${sourceId}::${trackId}`;
}

function findSourceById(sourceId) {
  const id = String(sourceId || "");
  if (!id) return null;
  return getSources().find((source) => source.id === id) || null;
}

function findTrackFromSourceById(source, trackId) {
  if (!source || !trackId) return null;
  const list =
    source.type === "onedrive"
      ? getCloudCacheForSource(source.id).tracks
      : getLocalDataForSource(source.id).tracks;
  const found = list.find((track) => track.id === trackId);
  return found ? withTrackSourceMetadata(found, source) : null;
}

function findTrackFromAnySource(trackId) {
  for (const source of getSources()) {
    const found = findTrackFromSourceById(source, trackId);
    if (found) return found;
  }
  return null;
}

function migrateLegacyListTracks(list) {
  if (!list || Array.isArray(list.tracks)) return;
  const legacyIds = Array.isArray(list.trackIds) ? list.trackIds : [];
  list.tracks = legacyIds
    .map((trackId) => findTrackFromAnySource(trackId))
    .filter(Boolean);
}

function getActiveTracks() {
  if (state.custom.activeListId === "cloud") return cloudTracks;
  const active = state.custom.lists.find((item) => item.id === state.custom.activeListId);
  if (!active) return [];
  migrateLegacyListTracks(active);
  return Array.isArray(active.tracks) ? active.tracks : [];
}

function createCustomTrackSnapshot(track) {
  const activeSource = getActiveSource();
  const sourceId = String(track?.sourceId || track?.localSourceId || activeSource?.id || "");
  const source = findSourceById(sourceId) || activeSource;
  if (!source) return null;
  const snapshot = withTrackSourceMetadata(track, source);
  if (snapshot.sourceType === "onedrive") {
    snapshot.streamUrl = "";
    snapshot.streamUrlExpiresAt = null;
  }
  return snapshot;
}

function toRepeatText(mode) {
  if (mode === "one") return "單曲";
  if (mode === "all") return "清單";
  return "關";
}

function formatTime(value) {
  if (!Number.isFinite(value) || value < 0) return "00:00";
  const total = Math.floor(value);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  if (hours > 0) {
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function formatTrackDuration(durationMs) {
  if (!Number.isFinite(durationMs) || durationMs <= 0) return "--:--";
  return formatTime(durationMs / 1000);
}

function updateTrackDuration(trackId, durationSeconds) {
  if (!trackId || !Number.isFinite(durationSeconds) || durationSeconds <= 0) return;
  const durationMs = Math.round(durationSeconds * 1000);
  let changed = false;
  cloudTracks = cloudTracks.map((track) => {
    if (track.id !== trackId || track.durationMs === durationMs) return track;
    changed = true;
    return { ...track, durationMs };
  });
  if (!changed) return;
  const activeSource = getActiveSource();
  const updatedTrack = cloudTracks.find((track) => track.id === trackId);
  if (updatedTrack && activeSource) {
    const originKey = getTrackOriginKey(updatedTrack);
    state.custom.lists.forEach((list) => {
      migrateLegacyListTracks(list);
      list.tracks = (list.tracks || []).map((track) =>
        getTrackOriginKey(track) === originKey ? { ...track, durationMs } : track
      );
    });
  }
  const source = getActiveSource();
  if (source?.type === "onedrive") {
    getCloudCacheForSource(source.id).tracks = cloudTracks.map((track) => ({ ...track }));
  } else if (source?.type === "local") {
    getLocalDataForSource(source.id).tracks = cloudTracks.map((track) => ({ ...track, streamUrl: "" }));
  }
  saveState(state);
  renderCloudList();
  renderCustomTracks();
  renderQueueList();
}

function updatePlaybackProgress(currentTime = 0, duration = 0) {
  const safeCurrent = Number.isFinite(currentTime) ? currentTime : 0;
  const safeDuration = Number.isFinite(duration) && duration > 0 ? duration : 0;
  if (!isScrubbing) {
    const value = safeDuration > 0 ? Math.min(1000, Math.round((safeCurrent / safeDuration) * 1000)) : 0;
    dom.progressInput.value = String(value);
  }
  dom.progressInput.disabled = safeDuration <= 0;
  dom.playbackTime.textContent = `${formatTime(safeCurrent)} / ${formatTime(safeDuration)}`;
}

function syncPlayerPrefs() {
  player.setVolume(state.prefs.volume);
  player.setMuted(state.prefs.muted);
  player.setPlaybackRate(state.prefs.playbackRate);

  dom.volumeInput.value = String(state.prefs.volume);
  dom.speedSelect.value = String(state.prefs.playbackRate);
  dom.shuffleBtn.setAttribute("aria-pressed", String(state.prefs.shuffle));
  dom.repeatBtn.dataset.mode = state.prefs.repeatMode;
  dom.hotkeysToggle.checked = Boolean(state.prefs.hotkeysEnabled);
  dom.cloudList.dataset.viewMode = getListViewMode("cloud");
  dom.customTracks.dataset.viewMode = getListViewMode("custom");
  dom.playQueueList.dataset.viewMode = getListViewMode("queue");
  syncIconButtons();
  syncShortcutInputs();
}

function renderAuth() {
  const account = getAccount();
  const displayName = account?.name || account?.username || "未登入";
  dom.accountLabel.textContent = displayName;
  dom.accountBadge.setAttribute("title", displayName);
  const initials = String(displayName)
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0] || "")
    .join("")
    .toUpperCase()
    .slice(0, 2) || "?";
  dom.accountFallback.textContent = initials;
  dom.accountAvatar.classList.add("hidden");
  dom.accountAvatar.removeAttribute("src");
  dom.loginBtn.classList.toggle("hidden", Boolean(account));
  dom.logoutBtn.classList.toggle("hidden", !account);
  const activeSource = getActiveSource();
  const isOnedrive = activeSource?.type === "onedrive";
  dom.refreshBtn.classList.toggle("hidden", !account || !isOnedrive);
}

function renderSyncInfo() {
  const source = getActiveSource();
  if (!source) {
    dom.syncInfo.textContent = "目前沒有可用來源。";
    return;
  }

  if (source.type === "local") {
    const localData = getLocalDataForSource(source.id);
    const cached = Array.isArray(localData.tracks) ? localData.tracks.length : 0;
    const last = localData.lastImportedAt
      ? new Date(localData.lastImportedAt).toLocaleString("zh-TW", { hour12: false })
      : "尚未匯入";
    dom.syncInfo.textContent = `來源: 本機 | 檔案數: ${cached} | 最後匯入: ${last}`;
    return;
  }

  const cache = getCloudCacheForSource(source.id);
  const cached = Array.isArray(cache.tracks) ? cache.tracks.length : 0;
  const last = cache.lastSyncedAt
    ? new Date(cache.lastSyncedAt).toLocaleString("zh-TW", { hour12: false })
    : "尚未同步";
  dom.syncInfo.textContent = `來源: OneDrive | 快取筆數: ${cached} | 最後同步: ${last}`;
}

function renderSourceSelect() {
  const sources = getSources();
  if (!dom.sourceSelect) return;
  dom.sourceSelect.innerHTML = "";
  sources.forEach((source) => {
    const opt = document.createElement("option");
    opt.value = source.id;
    opt.textContent = source.name;
    if (source.id === state.sources.activeSourceId) opt.selected = true;
    dom.sourceSelect.appendChild(opt);
  });
}

function renderSourceSettings() {
  const sources = getSources();
  if (!dom.sourceManageSelect) return;
  dom.sourceManageSelect.innerHTML = "";
  sources.forEach((source) => {
    const opt = document.createElement("option");
    opt.value = source.id;
    opt.textContent = `${source.name}${source.isDefault ? "（預設）" : ""}`;
    if (source.id === state.sources.activeSourceId) opt.selected = true;
    dom.sourceManageSelect.appendChild(opt);
  });

  const selectedId = dom.sourceManageSelect.value || state.sources.activeSourceId;
  const selected = sources.find((item) => item.id === selectedId);
  const cannotDelete = !selected || selected.isDefault || selected.id === state.sources.activeSourceId;
  dom.deleteSourceBtn.disabled = cannotDelete;
}

function createInvalidSourceError(message = "來源不合法") {
  const error = new Error(message);
  error.name = "InvalidSourceError";
  return error;
}

function setModalError(target, message) {
  if (!target) return;
  const hasMessage = Boolean(String(message || "").trim());
  target.textContent = hasMessage ? String(message) : "來源不合法";
  target.classList.toggle("hidden", !hasMessage);
}

function resetLocalSourceDraft() {
  dom.newLocalNameInput.value = "";
  dom.localRecursiveToggle.checked = false;
  pendingLocalFiles = [];
  pendingLocalImportMode = "files";
  dom.localFilesInput.value = "";
  dom.localFolderInput.value = "";
  updateLocalSelectionInfo();
}

function setSourceModalVisible(modal, visible) {
  if (!modal) return;
  modal.classList.toggle("hidden", !visible);
  modal.setAttribute("aria-hidden", String(!visible));
}

function openSourceModalByType(type) {
  if (type === "onedrive") {
    setModalError(dom.onedriveSourceError, "");
    setSourceModalVisible(dom.onedriveSourceModal, true);
    openSourceModal = "onedrive";
    document.body.classList.add("modal-open");
    dom.newOnedriveNameInput.focus();
    return;
  }
  setModalError(dom.localSourceError, "");
  setSourceModalVisible(dom.localSourceModal, true);
  openSourceModal = "local";
  document.body.classList.add("modal-open");
  dom.newLocalNameInput.focus();
}

function closeSourceModalByType(type) {
  if (type === "onedrive") {
    setSourceModalVisible(dom.onedriveSourceModal, false);
    setModalError(dom.onedriveSourceError, "");
    dom.newOnedriveNameInput.value = "";
    dom.newOnedriveUrlInput.value = "";
  } else {
    setSourceModalVisible(dom.localSourceModal, false);
    setModalError(dom.localSourceError, "");
    resetLocalSourceDraft();
  }
  openSourceModal = null;
  document.body.classList.remove("modal-open");
}

async function activateSource(sourceId, { forceSync = false } = {}) {
  if (!sourceId) return;
  if (!getSources().some((source) => source.id === sourceId)) return;
  sourceManager.setActiveSourceId(sourceId);
  rebuildActiveTracksFromSource();
  state.playback.currentId = null;
  state.playback.currentTime = 0;
  queueOpen = false;
  dom.nowPlaying.textContent = "尚未選擇影片";
  updatePlaybackProgress(0, 0);
  renderSourceSelect();
  renderSourceSettings();
  persistAndRender();
  if (getActiveSource()?.type === "onedrive" && !getAccount()) {
    window.location.replace(APP_CONFIG.auth.redirectPath);
    return;
  }
  await syncCloudVideos({ force: forceSync });
}

function validateOnedriveEndpoint(url) {
  const raw = String(url || "").trim();
  if (!raw) return false;
  return /graph\.microsoft\.com\/v1\.0\/drives\/[^/]+\/items\/[^/]+\/children/i.test(raw);
}

async function addOnedriveSource() {
  const name = String(dom.newOnedriveNameInput.value || "").trim();
  const childrenEndpoint = String(dom.newOnedriveUrlInput.value || "").trim();
  if (!name) {
    throw createInvalidSourceError();
  }
  if (!validateOnedriveEndpoint(childrenEndpoint)) {
    throw createInvalidSourceError();
  }

  try {
    const token = await getAccessToken();
    await fetchFolderMarker(token, { childrenEndpoint });
  } catch {
    throw createInvalidSourceError();
  }

  const id = `onedrive-${Date.now()}`;
  sourceManager.addSource({
    id,
    name,
    type: "onedrive",
    isDefault: false,
    childrenEndpoint,
  });
  dom.newOnedriveNameInput.value = "";
  dom.newOnedriveUrlInput.value = "";
  await activateSource(id, { forceSync: true });
  return id;
}

function updateLocalSelectionInfo() {
  const count = pendingLocalFiles.length;
  const modeText = pendingLocalImportMode === "folder" ? "資料夾" : "檔案";
  dom.localSelectionInfo.textContent =
    count > 0 ? `已選擇 ${count} 個${modeText}項目` : "尚未選擇本機檔案或資料夾";
}

async function persistLocalRuntimeFiles(sourceId, runtimeFiles) {
  const tasks = [];
  runtimeFiles.forEach((file, fileId) => {
    tasks.push(saveLocalRuntimeFile(sourceId, fileId, file));
  });
  await Promise.all(tasks);
}

async function collectFilesFromDirectoryHandle(directoryHandle, recursive) {
  const files = [];
  for await (const [, handle] of directoryHandle.entries()) {
    if (handle.kind === "file") {
      files.push(await handle.getFile());
      continue;
    }
    if (recursive && handle.kind === "directory") {
      const nested = await collectFilesFromDirectoryHandle(handle, recursive);
      files.push(...nested);
    }
  }
  return files;
}

async function pickLocalFilesFromDialog() {
  if (window.showOpenFilePicker) {
    const handles = await window.showOpenFilePicker({
      multiple: true,
      types: [
        {
          description: "MP4 影片",
          accept: {
            "video/mp4": [".mp4"],
          },
        },
      ],
      excludeAcceptAllOption: false,
    });
    const files = await Promise.all(handles.map((handle) => handle.getFile()));
    pendingLocalImportMode = "files";
    pendingLocalFiles = files;
    updateLocalSelectionInfo();
    return;
  }
  dom.localFilesInput.click();
}

async function pickLocalFolderFromDialog() {
  if (window.showDirectoryPicker) {
    const handle = await window.showDirectoryPicker();
    const recursive = Boolean(dom.localRecursiveToggle.checked);
    const files = await collectFilesFromDirectoryHandle(handle, recursive);
    pendingLocalImportMode = "folder";
    pendingLocalFiles = files;
    updateLocalSelectionInfo();
    return;
  }
  dom.localFolderInput.click();
}

async function addLocalSource() {
  const name = String(dom.newLocalNameInput.value || "").trim();
  if (!name) {
    throw createInvalidSourceError();
  }
  if (!pendingLocalFiles.length) {
    throw createInvalidSourceError();
  }

  setLoading(true, "分析本機來源中...");
  try {
    const sourceId = `local-${Date.now()}`;
    const acceptedExt = [".mp4"];
    const recursive = Boolean(dom.localRecursiveToggle.checked);
    const files = recursive
      ? pendingLocalFiles
      : pendingLocalFiles.filter((file) => String(file.webkitRelativePath || "").split("/").length <= 2);

    const { tracks, runtimeFiles } = await buildLocalSourceTracks({
      sourceId,
      files,
      acceptedExt,
      onProgress: (progress) => setLoading(true, progress.message),
    });
    if (!tracks.length) {
      throw createInvalidSourceError();
    }

    sourceManager.addSource({
      id: sourceId,
      name,
      type: "local",
      isDefault: false,
      childrenEndpoint: null,
      recursive,
    });
    getLocalDataForSource(sourceId).tracks = tracks;
    getLocalDataForSource(sourceId).acceptedExt = acceptedExt;
    getLocalDataForSource(sourceId).lastImportedAt = new Date().toISOString();
    getLocalDataForSource(sourceId).recursive = recursive;
    getLocalDataForSource(sourceId).importMode = pendingLocalImportMode;
    sourceManager.setRuntimeFiles(sourceId, runtimeFiles);
    await persistLocalRuntimeFiles(sourceId, runtimeFiles);

    resetLocalSourceDraft();
    await activateSource(sourceId);
    return sourceId;
  } finally {
    setLoading(false);
  }
}

async function deleteSelectedSource() {
  const deletingId = String(dom.sourceManageSelect.value || "");
  const source = getSources().find((item) => item.id === deletingId);
  if (!source) return;
  if (source.isDefault || source.id === state.sources.activeSourceId) {
    window.alert("目前來源不可刪除。");
    return;
  }

  sourceManager.removeSource(deletingId);
  if (source.type === "local") {
    removeLocalRuntimeFilesBySource(deletingId).catch(() => {});
  }
  renderSourceSelect();
  renderSourceSettings();
  saveState(state);
}

function renderListLabels() {
  const sourceName = getActiveSource()?.name || "來源清單";
  const activeText =
    state.custom.activeListId === "cloud"
      ? sourceName
      : state.custom.lists.find((item) => item.id === state.custom.activeListId)?.name || "未指定";
  const editing = getSelectedList();
  dom.activeListLabel.textContent = `播放器清單：${activeText}`;
  dom.editingListLabel.textContent =
    `正在編輯：${editing?.name || "未選擇"}（可從任一匯入來源點「加入」）`;
  updateAppTitle();
}

function createThumb(track) {
  if (track?.thumbnailUrl) {
    const img = document.createElement("img");
    img.className = "thumb";
    img.src = track.thumbnailUrl;
    img.alt = `${track.name} 縮圖`;
    img.loading = "lazy";
    return img;
  }
  const ph = document.createElement("div");
  ph.className = "thumb-placeholder";
  ph.textContent = "MP4";
  return ph;
}

function createTrackMeta(track) {
  const meta = document.createElement("div");
  meta.className = "track-meta";

  const label = document.createElement("span");
  label.className = "track-title";
  label.textContent = track.name;
  label.title = track.name;

  const duration = document.createElement("span");
  duration.className = "track-duration";
  duration.textContent = formatTrackDuration(track.durationMs);
  duration.setAttribute("aria-label", `片長 ${duration.textContent}`);

  meta.append(label, duration);
  return meta;
}

function renderCloudList() {
  dom.cloudList.innerHTML = "";
  if (cloudTracks.length === 0) {
    dom.cloudList.innerHTML = "<li>目前來源沒有可播放的 mp4。</li>";
    return;
  }

  const editing = getSelectedList();
  if (editing) migrateLegacyListTracks(editing);
  const editingIds = new Set((editing?.tracks || []).map((track) => getTrackOriginKey(track)));
  sortTracks("cloud", cloudTracks).forEach((track) => {
    const li = document.createElement("li");
    if (state.playback.currentId === track.id) li.classList.add("active");
    li.tabIndex = 0;
    li.setAttribute("role", "button");

    const thumb = createThumb(track);
    const meta = createTrackMeta(track);
    const originKey = getTrackOriginKey(track);
    const action = () => {
      if (currentRoute === "/playlist" && editing) {
        if (!editingIds.has(originKey)) {
          const snapshot = createCustomTrackSnapshot(track);
          if (!snapshot) return;
          editing.tracks.push(snapshot);
          persistAndRender();
        }
      } else {
        startPlayback(track.id);
      }
    };
    if (currentRoute === "/playlist" && editing) {
      const inList = editingIds.has(originKey);
      li.classList.toggle("in-list", inList);
      li.setAttribute("aria-label", `${track.name}，${inList ? "已加入目前清單" : "點擊加入"}`);
    } else {
      li.setAttribute("aria-label", `${track.name}，點擊播放`);
    }

    li.append(thumb, meta);
    li.addEventListener("click", action);
    li.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        action();
      }
    });
    dom.cloudList.appendChild(li);
  });
}

function renderCustomListSelect() {
  normalizeCustomState();
  dom.customListSelect.innerHTML = "";
  if (state.custom.lists.length === 0) {
    const opt = document.createElement("option");
    opt.value = "";
    opt.textContent = "無自訂清單";
    opt.selected = true;
    dom.customListSelect.appendChild(opt);
    dom.customListSelect.disabled = true;
    return;
  }

  dom.customListSelect.disabled = false;
  state.custom.lists.forEach((list) => {
    const opt = document.createElement("option");
    opt.value = list.id;
    opt.textContent = list.name;
    if (list.id === state.custom.selectedListId) opt.selected = true;
    dom.customListSelect.appendChild(opt);
  });
}

function renderCustomTracks() {
  dom.customTracks.innerHTML = "";
  const selected = getSelectedList();
  if (!selected) {
    dom.customTracks.innerHTML = "<li>尚無自訂清單。</li>";
    return;
  }

  migrateLegacyListTracks(selected);
  const tracks = Array.isArray(selected.tracks) ? selected.tracks : [];
  if (tracks.length === 0) {
    dom.customTracks.innerHTML = "<li>此清單目前沒有影片。</li>";
    return;
  }

  sortTracks("custom", tracks).forEach((track) => {
    const li = document.createElement("li");
    if (state.playback.currentId === track.id) li.classList.add("active");
    li.tabIndex = 0;
    li.setAttribute("role", "button");

    const thumb = createThumb(track);
    const meta = createTrackMeta(track);
    const action = () => {
      const targetKey = getTrackOriginKey(track);
      selected.tracks = selected.tracks.filter((item) => getTrackOriginKey(item) !== targetKey);
      persistAndRender();
    };
    li.setAttribute("aria-label", `${track.name}，點擊移除`);
    li.append(thumb, meta);
    li.addEventListener("click", action);
    li.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        action();
      }
    });
    dom.customTracks.appendChild(li);
  });
}

function renderQueueList() {
  dom.playQueueList.innerHTML = "";
  const tracks = getActiveTracks();
  if (tracks.length === 0) {
    dom.playQueueList.innerHTML = "<li>目前播放清單為空。</li>";
    return;
  }

  sortTracks("queue", tracks).forEach((track) => {
    const li = document.createElement("li");
    if (state.playback.currentId === track.id) li.classList.add("active");
    li.tabIndex = 0;
    li.setAttribute("role", "button");
    const thumb = createThumb(track);
    const meta = createTrackMeta(track);
    li.append(thumb, meta);
    li.addEventListener("click", () => startPlayback(track.id));
    li.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        startPlayback(track.id);
      }
    });
    dom.playQueueList.appendChild(li);
  });
}

function persistAndRender() {
  normalizeCustomState();
  state.custom.lists.forEach((list) => {
    migrateLegacyListTracks(list);
    delete list.trackIds;
  });
  const source = getActiveSource();
  if (source?.type === "onedrive") {
    getCloudCacheForSource(source.id).tracks = cloudTracks.map((track) => ({ ...track }));
  } else if (source?.type === "local") {
    getLocalDataForSource(source.id).tracks = cloudTracks.map((track) => ({ ...track, streamUrl: "" }));
  }
  saveState(state);
  renderSourceSelect();
  renderSourceSettings();
  renderCloudList();
  renderSyncInfo();
  renderCustomListSelect();
  renderCustomTracks();
  renderQueueList();
  renderListLabels();
  syncPlayerPrefs();
}

function syncPlaylistController() {
  const active = getActiveTracks();
  playlist.setTracks(active);
  playlist.toggleShuffle(state.prefs.shuffle);
  playlist.setRepeatMode(state.prefs.repeatMode);
  if (state.playback.currentId) {
    playlist.setCurrentById(state.playback.currentId);
  }
}

function setLoading(visible, text = "更新中...") {
  isSyncing = visible;
  dom.loadingText.textContent = text;
  dom.loadingOverlay.classList.toggle("hidden", !visible);
  setAuthControlsEnabled(true);
}

function setInlineLoading(visible, text = "讀取影片中...") {
  dom.inlineLoading.textContent = text;
  dom.inlineLoading.classList.toggle("hidden", !visible);
}

async function startPlayback(trackId, fromTime = 0, opts = {}) {
  const { showInlineLoading = false, autoplay = true, silentError = false, forceRefresh = false } = opts;
  state.playback.currentId = trackId;
  state.playback.currentTime = fromTime;

  syncPlaylistController();
  const current = playlist.setCurrentById(trackId);
  if (!current) {
    dom.nowPlaying.textContent = "找不到影片，可能已被移除。";
    updateAppTitle();
    persistAndRender();
    return;
  }

  let playable = current;
  try {
    setInlineLoading(showInlineLoading, "讀取影片中...");
    const targetSourceId = current?.sourceId || current?.localSourceId;
    const targetSource =
      findSourceById(targetSourceId) ||
      getActiveSource() || {
        id: DEFAULT_SOURCE_ID,
        type: "onedrive",
        childrenEndpoint: APP_CONFIG.graph.childrenEndpoint,
      };
    const sourceTrack =
      findTrackFromSourceById(targetSource, current.id) ||
      withTrackSourceMetadata(current, targetSource);
    playable = await sourceAccess.resolvePlayableTrack(targetSource, sourceTrack, {
      forceRefresh: forceRefresh,
    });
    if (targetSource?.type !== "local") {
      cacheHydratedTrackForSource(targetSource.id, playable);
    }
  } catch (error) {
    if (!silentError) console.error(error);
    if (!silentError) window.alert(`無法播放此影片：${error.message}`);
    return;
  } finally {
    setInlineLoading(false);
  }

  if (!playable.streamUrl) {
    if (!silentError) window.alert("此影片目前無法取得可播放連結。");
    return;
  }

  player.load(playable, fromTime);
  dom.nowPlaying.textContent = playable.name;
  updateAppTitle();
  updatePlaybackProgress(fromTime, dom.video.duration || 0);
  persistAndRender();

  if (!autoplay) return;
  try {
    await player.play();
  } catch {
    // user gesture restriction
  }
}

function cacheHydratedTrackForSource(sourceId, track) {
  if (!track?.id || !sourceId) return;
  const source = findSourceById(sourceId);
  if (!source || source.type !== "onedrive") return;
  const cache = getCloudCacheForSource(source.id);
  const next = cache.tracks.map((item) => (item.id === track.id ? { ...item, ...track } : item));
  const hasMatch = next.some((item) => item.id === track.id);
  if (hasMatch) {
    cache.tracks = next;
  }
  if (source.id === state.sources.activeSourceId) {
    cloudTracks = applySourceMetadataToTracks(cache.tracks, source);
  }
  state.custom.lists.forEach((list) => {
    migrateLegacyListTracks(list);
    list.tracks = (list.tracks || []).map((item) => {
      const sameSource = String(item?.sourceId || "") === String(sourceId);
      if (!sameSource || item.id !== track.id) return item;
      return {
        ...item,
        streamUrl: "",
        streamUrlExpiresAt: null,
        durationMs: track.durationMs ?? item.durationMs ?? null,
        sizeBytes: track.sizeBytes ?? item.sizeBytes ?? null,
        modifiedAt: track.modifiedAt ?? item.modifiedAt ?? null,
        driveId: track.driveId ?? item.driveId ?? null,
      };
    });
  });
}

async function playNext() {
  syncPlaylistController();
  const next = playlist.next();
  if (!next) return;
  await startPlayback(next.id, 0, { showInlineLoading: true, autoplay: true });
}

async function playPrev() {
  syncPlaylistController();
  const prev = playlist.prev();
  if (!prev) return;
  await startPlayback(prev.id, 0, { showInlineLoading: true, autoplay: true });
}

async function recoverCurrentPlayback() {
  const now = Date.now();
  if (isRecoveringSource || now - lastRecoveryAt < 4000) return;
  if (!state.playback.currentId) return;
  isRecoveringSource = true;
  lastRecoveryAt = now;
  const resumeAt = dom.video.currentTime || state.playback.currentTime || 0;
  try {
    await startPlayback(state.playback.currentId, resumeAt, {
      showInlineLoading: true,
      autoplay: true,
      silentError: true,
      forceRefresh: true,
    });
  } finally {
    isRecoveringSource = false;
  }
}

async function syncCloudVideos({ force = false } = {}) {
  const activeSource = getActiveSource();
  if (!activeSource) {
    cloudTracks = [];
    persistAndRender();
    return;
  }
  if (activeSource.type !== "onedrive") {
    cloudTracks = applySourceMetadataToTracks(getLocalDataForSource(activeSource.id).tracks, activeSource);
    state.playback.currentId = cloudTracks[0]?.id || null;
    state.playback.currentTime = 0;
    persistAndRender();
    return;
  }

  const sourceEndpoint = activeSource.childrenEndpoint || APP_CONFIG.graph.childrenEndpoint;
  const sourceCache = getCloudCacheForSource(activeSource.id);
  setLoading(true, "檢查雲端清單中...");
  try {
    const token = await getAccessToken();
    const requireMetadataRefresh = needsCloudCacheUpgrade();

    if (!force && !requireMetadataRefresh && cloudTracks.length > 0 && sourceCache.folderCTag) {
      try {
        const marker = await fetchFolderMarker(token, { childrenEndpoint: sourceEndpoint });
        const sameFolder = marker.cTag && marker.cTag === sourceCache.folderCTag;
        if (sameFolder) {
          sourceCache.lastSyncedAt = new Date().toISOString();
          persistAndRender();
          return;
        }
      } catch (markerError) {
        console.warn("marker 檢查失敗，改走 delta 比對", markerError);
      }
    }

    if (!force && !requireMetadataRefresh && sourceCache.deltaLink) {
      try {
        setLoading(true, "比對最新檔案與變更中...");
        const delta = await fetchVideoDelta(token, sourceCache.deltaLink, (progress) => {
          setLoading(true, `比對中... ${progress.message}`);
        });

        sourceCache.deltaLink = delta.deltaLink;
        if (delta.changedVideos.length === 0 && delta.deletedIds.length === 0) {
          sourceCache.lastSyncedAt = new Date().toISOString();
          persistAndRender();
          return;
        }

        setLoading(
          true,
          `更新變更檔案中... +${delta.changedVideos.length} / -${delta.deletedIds.length}`
        );
        const map = new Map(cloudTracks.map((track) => [track.id, track]));
        delta.changedVideos.forEach((track) => {
          const cached = map.get(track.id);
          map.set(track.id, mergeTrackWithCache(track, cached));
        });
        delta.deletedIds.forEach((id) => map.delete(id));
        cloudTracks = applySourceMetadataToTracks(
          [...map.values()].sort((a, b) => a.name.localeCompare(b.name, "zh-Hant")),
          activeSource
        );

        const latest = computeLatest(cloudTracks);
        sourceCache.latestModifiedAt = latest.latestModifiedAt;
        sourceCache.latestItemId = latest.latestItemId;
        sourceCache.version = CLOUD_CACHE_VERSION;
        try {
          const marker = await fetchFolderMarker(token, { childrenEndpoint: sourceEndpoint });
          sourceCache.folderCTag = marker.cTag || null;
        } catch {
          // marker 失敗不阻斷同步
        }
        sourceCache.lastSyncedAt = new Date().toISOString();
        ensurePlaybackTarget();
        persistAndRender();
        return;
      } catch (error) {
        if (!shouldFallbackFromDelta(error)) {
          throw error;
        }
        console.warn("deltaLink 失效，改走完整重建", error);
        sourceCache.deltaLink = null;
      }
    }

    if (!sourceCache.deltaLink) {
      try {
        setLoading(true, "首次整理雲端清單中...");
        const full = await fetchAllVideosViaDelta(token, (progress) => {
          setLoading(true, `首次整理中... ${progress.message}`);
        }, { childrenEndpoint: sourceEndpoint });
        const existingMap = new Map(cloudTracks.map((track) => [track.id, track]));
        cloudTracks = applySourceMetadataToTracks(
          full.tracks
            .map((track) => mergeTrackWithCache(track, existingMap.get(track.id)))
            .sort((a, b) => a.name.localeCompare(b.name, "zh-Hant")),
          activeSource
        );
        sourceCache.deltaLink = full.deltaLink;
        sourceCache.latestModifiedAt = full.latest.latestModifiedAt;
        sourceCache.latestItemId = full.latest.latestItemId;
        sourceCache.version = CLOUD_CACHE_VERSION;
        try {
          const marker = await fetchFolderMarker(token, { childrenEndpoint: sourceEndpoint });
          sourceCache.folderCTag = marker.cTag || null;
        } catch {
          sourceCache.folderCTag = null;
        }
        sourceCache.lastSyncedAt = new Date().toISOString();
        ensurePlaybackTarget();
        persistAndRender();
        return;
      } catch (error) {
        console.warn("首次 delta 初始化失敗，改走 children 重建", error);
      }
    }

    setLoading(true, "重建雲端清單中...");
    const tracks = await fetchAllVideosViaChildren(token, (progress) => {
      setLoading(true, `重建清單中... ${progress.message}`);
    }, { childrenEndpoint: sourceEndpoint });
    const existingMap = new Map(cloudTracks.map((track) => [track.id, track]));
    cloudTracks = applySourceMetadataToTracks(
      tracks
        .map((track) => mergeTrackWithCache(track, existingMap.get(track.id)))
        .sort((a, b) => a.name.localeCompare(b.name, "zh-Hant")),
      activeSource
    );
    try {
      const full = await fetchAllVideosViaDelta(token, () => {}, { childrenEndpoint: sourceEndpoint });
      sourceCache.deltaLink = full.deltaLink;
    } catch (error) {
      const msg = String(error?.message || "");
      if (!msg.includes("不支援 delta")) {
        console.warn("delta 初始化失敗，將僅使用 children 同步", error);
      }
      sourceCache.deltaLink = null;
    }
    const latest = computeLatest(cloudTracks);
    sourceCache.latestModifiedAt = latest.latestModifiedAt;
    sourceCache.latestItemId = latest.latestItemId;
    sourceCache.version = CLOUD_CACHE_VERSION;
    try {
      const marker = await fetchFolderMarker(token, { childrenEndpoint: sourceEndpoint });
      sourceCache.folderCTag = marker.cTag || null;
    } catch {
      sourceCache.folderCTag = null;
    }
    sourceCache.lastSyncedAt = new Date().toISOString();
    ensurePlaybackTarget();
    persistAndRender();
  } finally {
    setLoading(false);
  }
}

function shouldFallbackFromDelta(error) {
  const message = String(error?.message || "").toLowerCase();
  return message.includes(" 400") || message.includes(" 410") || message.includes("deltalink");
}

function ensurePlaybackTarget() {
  if (cloudTracks.length > 0 && !state.playback.currentId) {
    state.playback.currentId = cloudTracks[0].id;
  }
}

function needsCloudCacheUpgrade() {
  return Number(getActiveCloudCache()?.version || 1) < CLOUD_CACHE_VERSION;
}

function mergeTrackWithCache(track, cached) {
  if (!cached || cached.id !== track.id) {
    return { ...track };
  }

  return {
    ...track,
    streamUrl: cached.streamUrl || track.streamUrl || "",
    streamUrlExpiresAt: cached.streamUrlExpiresAt || track.streamUrlExpiresAt || null,
    thumbnailUrl: track.thumbnailUrl || cached.thumbnailUrl || "",
    durationMs: track.durationMs || cached.durationMs || null,
    sizeBytes: track.sizeBytes ?? cached.sizeBytes ?? null,
  };
}

function seekBy(seconds) {
  const duration = Number.isFinite(dom.video.duration) ? dom.video.duration : 0;
  if (duration <= 0) return;
  const nextTime = Math.min(duration, Math.max(0, dom.video.currentTime + seconds));
  dom.video.currentTime = nextTime;
  state.playback.currentTime = nextTime;
  updatePlaybackProgress(nextTime, duration);
  saveState(state);
}

function shouldIgnoreHotkey(event) {
  if (event.metaKey) return true;
  const target = event.target;
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return (
    tag === "INPUT" ||
    tag === "SELECT" ||
    tag === "TEXTAREA" ||
    tag === "BUTTON" ||
    target.isContentEditable
  );
}

function bindHotkeys() {
  window.addEventListener("keydown", (event) => {
    if (!state.prefs.hotkeysEnabled || shouldIgnoreHotkey(event)) return;

    const combo = normalizeShortcut(event);
    if (!combo) return;

    if (combo === state.prefs.hotkeys.playPause) {
      event.preventDefault();
      player.togglePlay();
      return;
    }
    if (combo === state.prefs.hotkeys.seekBack) {
      event.preventDefault();
      seekBy(-10);
      return;
    }
    if (combo === state.prefs.hotkeys.seekForward) {
      event.preventDefault();
      seekBy(10);
      return;
    }
    if (combo === state.prefs.hotkeys.prevTrack) {
      event.preventDefault();
      playPrev();
      return;
    }
    if (combo === state.prefs.hotkeys.nextTrack) {
      event.preventDefault();
      playNext();
      return;
    }
    if (combo === state.prefs.hotkeys.toggleMute) {
      event.preventDefault();
      state.prefs.muted = !state.prefs.muted;
      player.setMuted(state.prefs.muted);
      persistAndRender();
      return;
    }
    if (combo === state.prefs.hotkeys.toggleShuffle) {
      event.preventDefault();
      state.prefs.shuffle = !state.prefs.shuffle;
      persistAndRender();
      return;
    }
    if (combo === state.prefs.hotkeys.cycleRepeat) {
      event.preventDefault();
      const modes = ["off", "one", "all"];
      const idx = modes.indexOf(state.prefs.repeatMode);
      state.prefs.repeatMode = modes[(idx + 1) % modes.length];
      persistAndRender();
      return;
    }
    if (combo === state.prefs.hotkeys.toggleQueue) {
      event.preventDefault();
      setQueueOpen(!queueOpen);
      saveState(state);
      syncPlayerPrefs();
      return;
    }
    if (combo === state.prefs.hotkeys.toggleFullscreen) {
      event.preventDefault();
      player.toggleFullscreen().catch(() => {});
      syncPlayerPrefs();
    }
  });
}

function setAuthControlsEnabled(enabled) {
  const allow = Boolean(enabled) && !isSyncing;
  const activeSource = getActiveSource();
  dom.loginBtn.disabled = !allow;
  dom.logoutBtn.disabled = !allow;
  dom.refreshBtn.disabled = !allow || activeSource?.type !== "onedrive";
}

function bindShortcutEditors() {
  Object.entries(dom.shortcutInputs).forEach(([action, input]) => {
    input.addEventListener("focus", () => {
      capturingShortcutAction = action;
      syncShortcutInputs();
    });

    input.addEventListener("click", () => {
      capturingShortcutAction = action;
      syncShortcutInputs();
    });

    input.addEventListener("keydown", (event) => {
      event.preventDefault();
      if (event.key === "Escape") {
        capturingShortcutAction = null;
        syncShortcutInputs();
        input.blur();
        return;
      }

      const combo = normalizeShortcut(event);
      if (!combo) return;

      Object.keys(state.prefs.hotkeys).forEach((name) => {
        if (name !== action && state.prefs.hotkeys[name] === combo) {
          state.prefs.hotkeys[name] = "";
        }
      });
      state.prefs.hotkeys[action] = combo;
      capturingShortcutAction = null;
      saveState(state);
      syncShortcutInputs();
      input.blur();
    });
  });

  dom.resetHotkeysBtn.addEventListener("click", () => {
    state.prefs.hotkeys = { ...DEFAULT_HOTKEYS };
    capturingShortcutAction = null;
    saveState(state);
    syncShortcutInputs();
  });
}

function bindEvents() {
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredInstallPrompt = event;
    updateInstallButton();
  });
  window.addEventListener("appinstalled", () => {
    deferredInstallPrompt = null;
    updateInstallButton();
  });
  dom.navPlayerBtn.addEventListener("click", () => updateRoute("/player"));
  dom.navPlaylistBtn.addEventListener("click", () => updateRoute("/playlist"));
  dom.navSettingsBtn.addEventListener("click", () => updateRoute("/settings"));
  dom.sourceSelect?.addEventListener("change", async () => {
    try {
      await activateSource(dom.sourceSelect.value);
      renderAuth();
    } catch (error) {
      console.error(error);
      window.alert(`切換來源失敗：${error.message}`);
    }
  });
  dom.sourceManageSelect?.addEventListener("change", () => renderSourceSettings());
  dom.deleteSourceBtn?.addEventListener("click", () => deleteSelectedSource());
  dom.openOnedriveSourceModalBtn?.addEventListener("click", () => openSourceModalByType("onedrive"));
  dom.openLocalSourceModalBtn?.addEventListener("click", () => openSourceModalByType("local"));
  dom.cancelOnedriveSourceBtn?.addEventListener("click", () => closeSourceModalByType("onedrive"));
  dom.cancelLocalSourceBtn?.addEventListener("click", () => closeSourceModalByType("local"));
  dom.onedriveSourceModal?.addEventListener("click", (event) => {
    if (event.target === dom.onedriveSourceModal) {
      closeSourceModalByType("onedrive");
    }
  });
  dom.localSourceModal?.addEventListener("click", (event) => {
    if (event.target === dom.localSourceModal) {
      closeSourceModalByType("local");
    }
  });
  dom.addOnedriveSourceBtn?.addEventListener("click", async () => {
    setModalError(dom.onedriveSourceError, "");
    try {
      await addOnedriveSource();
      closeSourceModalByType("onedrive");
      renderAuth();
    } catch (error) {
      console.error(error);
      if (String(error?.name || "") === "InvalidSourceError") {
        setModalError(dom.onedriveSourceError, "來源不合法");
        return;
      }
      setModalError(dom.onedriveSourceError, "來源不合法");
    }
  });
  dom.pickLocalFilesBtn?.addEventListener("click", async () => {
    try {
      await pickLocalFilesFromDialog();
    } catch (error) {
      if (String(error?.name || "") === "AbortError") return;
      console.error(error);
      window.alert(`選擇本機檔案失敗：${error.message}`);
    }
  });
  dom.pickLocalFolderBtn?.addEventListener("click", async () => {
    try {
      await pickLocalFolderFromDialog();
    } catch (error) {
      if (String(error?.name || "") === "AbortError") return;
      console.error(error);
      window.alert(`選擇本機資料夾失敗：${error.message}`);
    }
  });
  dom.localFilesInput?.addEventListener("change", () => {
    pendingLocalImportMode = "files";
    pendingLocalFiles = Array.from(dom.localFilesInput.files || []);
    updateLocalSelectionInfo();
  });
  dom.localFolderInput?.addEventListener("change", () => {
    pendingLocalImportMode = "folder";
    pendingLocalFiles = Array.from(dom.localFolderInput.files || []);
    updateLocalSelectionInfo();
  });
  dom.addLocalSourceBtn?.addEventListener("click", async () => {
    setModalError(dom.localSourceError, "");
    try {
      await addLocalSource();
      closeSourceModalByType("local");
      renderAuth();
    } catch (error) {
      console.error(error);
      if (String(error?.name || "") === "InvalidSourceError") {
        setModalError(dom.localSourceError, "來源不合法");
        return;
      }
      setModalError(dom.localSourceError, "來源不合法");
    }
  });
  dom.installAppBtn.addEventListener("click", () => installApp());
  dom.mobileMenuBtn.addEventListener("click", () => {
    setMobilePlayerChromeVisible(!mobilePlayerChromeVisible);
  });
  dom.cloudMobileToolsBtn?.addEventListener("click", () => {
    mobileCloudToolsVisible = !mobileCloudToolsVisible;
    syncMobilePlaylistToolsVisibility();
  });
  dom.customMobileToolsBtn?.addEventListener("click", () => {
    mobileCustomToolsVisible = !mobileCustomToolsVisible;
    syncMobilePlaylistToolsVisibility();
  });
  dom.queueToggleBtn.addEventListener("click", () => setQueueOpen(!queueOpen));
  dom.queueCloseBtn.addEventListener("click", () => setQueueOpen(false));
  window.addEventListener("keydown", (event) => {
    if (event.key !== "Escape" || !openSourceModal) return;
    if (openSourceModal === "onedrive") {
      closeSourceModalByType("onedrive");
      return;
    }
    closeSourceModalByType("local");
  });
  window.addEventListener("popstate", () => updateRoute(resolveCurrentRoute(window.location.pathname, appBasePath), true));
  window.matchMedia("(max-width: 900px)").addEventListener("change", () => applyMobileLayoutState());
  ["pointermove", "pointerdown", "touchstart"].forEach((eventName) => {
    dom.playerPanel.addEventListener(eventName, () => revealFullscreenControls(), { passive: true });
  });
  dom.playerPanel.addEventListener("keydown", () => revealFullscreenControls());

  dom.loginBtn.addEventListener("click", async () => {
    try {
      dom.accountLabel.textContent = "登入中...";
      await login();
    } catch (error) {
      console.error(error);
      window.alert(`登入失敗：${error.message}`);
    }
  });

  dom.logoutBtn.addEventListener("click", async () => {
    try {
      dom.accountLabel.textContent = "登出中...";
      await logout();
      resetCloudState();
      renderAuth();
      persistAndRender();
    } catch (error) {
      console.error(error);
      window.alert(`登出失敗：${error.message}`);
    }
  });

  dom.refreshBtn.addEventListener("click", async () => {
    try {
      await syncCloudVideos({ force: true });
    } catch (error) {
      console.error(error);
      window.alert(`更新清單失敗：${error.message}`);
    }
  });
  dom.cloudSortFieldSelect.addEventListener("change", () => {
    setListSort("cloud", { field: dom.cloudSortFieldSelect.value });
  });
  dom.customSortFieldSelect.addEventListener("change", () => {
    setListSort("custom", { field: dom.customSortFieldSelect.value });
  });
  dom.queueSortFieldSelect.addEventListener("change", () => {
    setListSort("queue", { field: dom.queueSortFieldSelect.value });
  });
  dom.cloudSortDirectionBtn.addEventListener("click", () => {
    setListSort("cloud", { direction: getListSort("cloud").direction === "asc" ? "desc" : "asc" });
  });
  dom.customSortDirectionBtn.addEventListener("click", () => {
    setListSort("custom", { direction: getListSort("custom").direction === "asc" ? "desc" : "asc" });
  });
  dom.queueSortDirectionBtn.addEventListener("click", () => {
    setListSort("queue", { direction: getListSort("queue").direction === "asc" ? "desc" : "asc" });
  });
  dom.cloudViewModeBtn.addEventListener("click", () => toggleListViewMode("cloud"));
  dom.customViewModeBtn.addEventListener("click", () => toggleListViewMode("custom"));
  dom.queueViewModeBtn.addEventListener("click", () => toggleListViewMode("queue"));

  dom.playBtn.addEventListener("click", () => player.togglePlay());
  dom.prevBtn.addEventListener("click", playPrev);
  dom.rewindBtn.addEventListener("click", () => seekBy(-10));
  dom.nextBtn.addEventListener("click", playNext);
  dom.forwardBtn.addEventListener("click", () => seekBy(10));
  dom.fullscreenBtn.addEventListener("click", async () => {
    try {
      await player.toggleFullscreen();
      syncPlayerPrefs();
    } catch (error) {
      console.error(error);
    }
  });
  document.addEventListener("fullscreenchange", () => syncPlayerPrefs());
  document.addEventListener("fullscreenchange", () => revealFullscreenControls());

  dom.shuffleBtn.addEventListener("click", () => {
    state.prefs.shuffle = !state.prefs.shuffle;
    persistAndRender();
  });

  dom.repeatBtn.addEventListener("click", () => {
    const modes = ["off", "one", "all"];
    const idx = modes.indexOf(state.prefs.repeatMode);
    state.prefs.repeatMode = modes[(idx + 1) % modes.length];
    persistAndRender();
  });

  dom.volumeInput.addEventListener("input", () => {
    state.prefs.volume = Number(dom.volumeInput.value);
    player.setVolume(state.prefs.volume);
    saveState(state);
  });

  dom.muteBtn.addEventListener("click", () => {
    state.prefs.muted = !state.prefs.muted;
    player.setMuted(state.prefs.muted);
    persistAndRender();
  });

  dom.speedSelect.addEventListener("change", () => {
    state.prefs.playbackRate = Number(dom.speedSelect.value);
    player.setPlaybackRate(state.prefs.playbackRate);
    saveState(state);
  });

  dom.hotkeysToggle.addEventListener("change", () => {
    state.prefs.hotkeysEnabled = dom.hotkeysToggle.checked;
    saveState(state);
  });

  dom.newListBtn.addEventListener("click", () => {
    const name = window.prompt("請輸入新清單名稱");
    if (!name) return;
    const id = `list-${Date.now()}`;
    state.custom.lists.push({ id, name, tracks: [] });
    state.custom.selectedListId = id;
    persistAndRender();
  });

  dom.deleteListBtn.addEventListener("click", () => {
    const deletingId = state.custom.selectedListId;
    if (!deletingId) {
      window.alert("目前沒有可刪除的自訂清單。");
      return;
    }
    state.custom.lists = state.custom.lists.filter((item) => item.id !== deletingId);
    state.custom.selectedListId = state.custom.lists[0]?.id || null;
    if (state.custom.activeListId === deletingId) {
      state.custom.activeListId = "cloud";
    }
    persistAndRender();
  });

  dom.customListSelect.addEventListener("change", () => {
    state.custom.selectedListId = dom.customListSelect.value || null;
    persistAndRender();
  });

  dom.setActiveListBtn.addEventListener("click", () => {
    state.custom.activeListId = state.custom.selectedListId || "cloud";
    persistAndRender();
  });

  dom.video.addEventListener("ended", () => playNext());
  dom.video.addEventListener("error", () => recoverCurrentPlayback());
  dom.video.addEventListener("play", () => {
    syncPlayerPrefs();
    updateAppTitle();
  });
  dom.video.addEventListener("pause", () => {
    syncPlayerPrefs();
    updateAppTitle();
  });
  dom.video.addEventListener("loadedmetadata", () => {
    updateTrackDuration(state.playback.currentId, dom.video.duration);
    updatePlaybackProgress(dom.video.currentTime, dom.video.duration);
  });
  dom.video.addEventListener("durationchange", () => {
    updateTrackDuration(state.playback.currentId, dom.video.duration);
    updatePlaybackProgress(dom.video.currentTime, dom.video.duration);
  });
  dom.video.addEventListener("timeupdate", () => {
    state.playback.currentTime = dom.video.currentTime;
    updatePlaybackProgress(dom.video.currentTime, dom.video.duration);
    saveState(state);
  });

  dom.progressInput.addEventListener("input", () => {
    isScrubbing = true;
    const duration = Number.isFinite(dom.video.duration) ? dom.video.duration : 0;
    const ratio = Number(dom.progressInput.value) / 1000;
    updatePlaybackProgress(duration * ratio, duration);
  });

  dom.progressInput.addEventListener("change", () => {
    const duration = Number.isFinite(dom.video.duration) ? dom.video.duration : 0;
    if (duration > 0) {
      const ratio = Number(dom.progressInput.value) / 1000;
      const targetTime = duration * ratio;
      dom.video.currentTime = targetTime;
      state.playback.currentTime = targetTime;
      saveState(state);
    }
    isScrubbing = false;
    updatePlaybackProgress(dom.video.currentTime, dom.video.duration);
  });

  dom.progressInput.addEventListener("pointerdown", () => {
    isScrubbing = true;
  });
}

async function bootstrap() {
  await cleanupLegacyOfflineState();
  await registerPwa();
  bindEvents();
  bindHotkeys();
  bindShortcutEditors();
  applyMobileLayoutState();
  setQueueOpen(false);
  updatePlaybackProgress(0, 0);
  updateAppTitle();
  updateInstallButton();
  updateRoute(
    restoreGithubPagesRoute(appBasePath) || resolveCurrentRoute(window.location.pathname, appBasePath),
    true
  );
  renderSourceSelect();
  renderSourceSettings();
  updateLocalSelectionInfo();
  syncPlayerPrefs();
  setAuthControlsEnabled(false);
  const activeSource = getActiveSource();
  if (activeSource?.type === "onedrive") {
    try {
      await initAuth();
    } finally {
      setAuthControlsEnabled(true);
    }
  } else {
    setAuthControlsEnabled(true);
  }

  if (activeSource?.type === "onedrive" && !getAccount()) {
    window.location.replace(APP_CONFIG.auth.redirectPath);
    return;
  }
  document.body.classList.remove("auth-pending");

  renderAuth();
  renderSyncInfo();
  renderCustomListSelect();
  renderCustomTracks();
  renderListLabels();
  renderQueueList();

  let syncSucceeded = false;
  if (activeSource?.type === "local") {
    rebuildActiveTracksFromSource();
    syncSucceeded = true;
    persistAndRender();
  } else if (getAccount()) {
    try {
      await syncCloudVideos({ force: false });
      syncSucceeded = true;
    } catch (error) {
      console.error(error);
      window.alert(`初始化同步失敗：${error.message}`);
    }
  } else {
    renderCloudList();
    renderQueueList();
  }

  const active = getActiveTracks();
  if (syncSucceeded && active.length > 0 && state.playback.currentId) {
    const track = active.find((item) => item.id === state.playback.currentId);
    if (track) {
      dom.nowPlaying.textContent = track.name;
       updateAppTitle();
      await startPlayback(track.id, state.playback.currentTime || 0, {
        autoplay: false,
        silentError: true,
      });
    } else {
      state.playback.currentId = active[0].id;
      state.playback.currentTime = 0;
      persistAndRender();
    }
  }

  window.setInterval(async () => {
    const source = getActiveSource();
    if (source?.type !== "onedrive") return;
    if (!getAccount()) return;
    try {
      await syncCloudVideos({ force: false });
    } catch (error) {
      console.error("定期更新失敗", error);
    }
  }, APP_CONFIG.graph.refreshMs);
}

export class AppController {
  async start() {
    try {
      await bootstrap();
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      console.error(err);
      window.alert(`初始化失敗：${err.message}`);
    }
  }
}

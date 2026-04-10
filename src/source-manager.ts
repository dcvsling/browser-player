type AppState = Record<string, any>;
type AppConfigLike = Record<string, any>;

type EmptyCloudCache = {
  tracks: any[];
  deltaLink: string | null;
  latestModifiedAt: string | null;
  latestItemId: string | null;
  folderCTag: string | null;
  lastSyncedAt: string | null;
  version: number;
};

export class SourceManager {
  private state: AppState;
  private appConfig: AppConfigLike;
  private defaultSourceId: string;
  private cloudCacheVersion: number;
  private localRuntimeFilesBySource: Map<string, Map<string, File>>;

  constructor({
    state,
    appConfig,
    defaultSourceId,
    cloudCacheVersion,
  }: {
    state: AppState;
    appConfig: AppConfigLike;
    defaultSourceId: string;
    cloudCacheVersion: number;
  }) {
    this.state = state;
    this.appConfig = appConfig;
    this.defaultSourceId = defaultSourceId;
    this.cloudCacheVersion = cloudCacheVersion;
    this.localRuntimeFilesBySource = new Map();
  }

  createEmptyCloudCache(): EmptyCloudCache {
    return {
      tracks: [],
      deltaLink: null,
      latestModifiedAt: null,
      latestItemId: null,
      folderCTag: null,
      lastSyncedAt: null,
      version: this.cloudCacheVersion,
    };
  }

  ensureState() {
    if (!this.state.sources || typeof this.state.sources !== "object") {
      this.state.sources = {
        activeSourceId: this.defaultSourceId,
        items: [],
        onedriveCaches: {},
        localSources: {},
      };
    }
    if (!Array.isArray(this.state.sources.items)) {
      this.state.sources.items = [];
    }
    if (!this.state.sources.items.some((source: any) => source.id === this.defaultSourceId)) {
      this.state.sources.items.unshift({
        id: this.defaultSourceId,
        name: "OneDrive",
        type: "onedrive",
        isDefault: true,
        childrenEndpoint: this.appConfig.graph.childrenEndpoint,
      });
    }
    if (
      !this.state.sources.activeSourceId ||
      !this.state.sources.items.some((s: any) => s.id === this.state.sources.activeSourceId)
    ) {
      this.state.sources.activeSourceId = this.defaultSourceId;
    }
    if (!this.state.sources.onedriveCaches || typeof this.state.sources.onedriveCaches !== "object") {
      this.state.sources.onedriveCaches = {};
    }
    if (!this.state.sources.localSources || typeof this.state.sources.localSources !== "object") {
      this.state.sources.localSources = {};
    }

    this.state.sources.items
      .filter((source: any) => source.type === "onedrive")
      .forEach((source: any) => {
        if (!this.state.sources.onedriveCaches[source.id]) {
          this.state.sources.onedriveCaches[source.id] = this.createEmptyCloudCache();
        }
      });

    this.state.sources.items
      .filter((source: any) => source.type === "local")
      .forEach((source: any) => {
        if (!this.state.sources.localSources[source.id]) {
          this.state.sources.localSources[source.id] = {
            tracks: [],
            acceptedExt: [".mp4"],
            lastImportedAt: null,
            recursive: false,
            importMode: "files",
          };
        }
      });
  }

  getSources() {
    this.ensureState();
    return this.state.sources.items;
  }

  getActiveSource() {
    this.ensureState();
    return (
      this.getSources().find((source: any) => source.id === this.state.sources.activeSourceId) ||
      this.getSources()[0]
    );
  }

  setActiveSourceId(sourceId: string) {
    this.ensureState();
    this.state.sources.activeSourceId = sourceId;
  }

  getCloudCacheForSource(sourceId: string) {
    this.ensureState();
    if (!this.state.sources.onedriveCaches[sourceId]) {
      this.state.sources.onedriveCaches[sourceId] = this.createEmptyCloudCache();
    }
    return this.state.sources.onedriveCaches[sourceId];
  }

  getLocalDataForSource(sourceId: string) {
    this.ensureState();
    if (!this.state.sources.localSources[sourceId]) {
      this.state.sources.localSources[sourceId] = {
        tracks: [],
        acceptedExt: [".mp4"],
        lastImportedAt: null,
        recursive: false,
        importMode: "files",
      };
    }
    return this.state.sources.localSources[sourceId];
  }

  getActiveCloudCache() {
    const source = this.getActiveSource();
    if (!source || source.type !== "onedrive") return this.createEmptyCloudCache();
    return this.getCloudCacheForSource(source.id);
  }

  rebuildActiveTracksFromSource() {
    const source = this.getActiveSource();
    if (!source) return [];
    if (source.type === "onedrive") {
      return [...this.getCloudCacheForSource(source.id).tracks];
    }
    return [...this.getLocalDataForSource(source.id).tracks];
  }

  addSource(source: any) {
    this.ensureState();
    this.state.sources.items.push(source);
    if (source.type === "onedrive") {
      this.state.sources.onedriveCaches[source.id] = this.createEmptyCloudCache();
    } else if (source.type === "local") {
      this.state.sources.localSources[source.id] = {
        tracks: [],
        acceptedExt: [".mp4"],
        lastImportedAt: null,
        recursive: false,
        importMode: "files",
      };
    }
  }

  removeSource(sourceId: string) {
    this.ensureState();
    const source = this.getSources().find((item: any) => item.id === sourceId);
    this.state.sources.items = this.state.sources.items.filter((item: any) => item.id !== sourceId);
    if (source?.type === "onedrive") {
      delete this.state.sources.onedriveCaches[sourceId];
    } else if (source?.type === "local") {
      delete this.state.sources.localSources[sourceId];
      this.localRuntimeFilesBySource.delete(sourceId);
    }
  }

  setRuntimeFiles(sourceId: string, runtimeFiles: Map<string, File>) {
    this.localRuntimeFilesBySource.set(sourceId, runtimeFiles);
  }

  setRuntimeFile(sourceId: string, fileId: string, file: File) {
    const map = this.localRuntimeFilesBySource.get(sourceId) || new Map<string, File>();
    map.set(fileId, file);
    this.localRuntimeFilesBySource.set(sourceId, map);
  }

  clearRuntimeFiles(sourceId: string) {
    this.localRuntimeFilesBySource.delete(sourceId);
  }

  getRuntimeFile(sourceId: string, fileId: string) {
    return this.localRuntimeFilesBySource.get(sourceId)?.get(fileId) || null;
  }
}

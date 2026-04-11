type SourceType = "onedrive" | "local";

type SourceRecord = {
  id: string;
  type: SourceType;
  childrenEndpoint?: string | null;
};

type TrackRecord = {
  id: string;
  name: string;
  streamUrl?: string;
  streamUrlExpiresAt?: string | null;
  localFileId?: string | null;
  [key: string]: unknown;
};

type ResolvePlayableOptions = {
  forceRefresh?: boolean;
};

type OrchestratorDeps = {
  getAccessToken: () => Promise<string>;
  hydrateTrackStreamUrl: (
    accessToken: string,
    track: TrackRecord,
    options?: { force?: boolean; childrenEndpoint?: string }
  ) => Promise<TrackRecord>;
  getLocalRuntimeFile: (sourceId: string, fileId: string) => Promise<File | null>;
};

export class SourceAccessOrchestrator {
  private deps: OrchestratorDeps;

  constructor(deps: OrchestratorDeps) {
    this.deps = deps;
  }

  async resolvePlayableTrack(
    source: SourceRecord,
    track: TrackRecord,
    options: ResolvePlayableOptions = {}
  ): Promise<TrackRecord> {
    if (source.type === "local") {
      const fileId = String(track.localFileId || track.id || "");
      const file = await this.deps.getLocalRuntimeFile(source.id, fileId);
      if (!file) {
        throw new Error("本機來源檔案無法直接存取，請重新匯入一次。");
      }
      return {
        ...track,
        streamUrl: URL.createObjectURL(file),
        streamUrlExpiresAt: null,
      };
    }

    const hasInvalidStreamUrl = isInvalidPlayableUrl(String(track?.streamUrl || ""));
    const token = await this.deps.getAccessToken();
    const hydrated = await this.deps.hydrateTrackStreamUrl(token, track, {
      force: Boolean(options.forceRefresh) || hasInvalidStreamUrl,
      childrenEndpoint: String(source.childrenEndpoint || ""),
    });
    if (isInvalidPlayableUrl(String(hydrated?.streamUrl || ""))) {
      throw new Error("來源提供的是縮圖連結，非可播放影片連結。請重新同步來源。");
    }
    return hydrated;
  }
}

function isInvalidPlayableUrl(url: string): boolean {
  const raw = String(url || "").toLowerCase();
  if (!raw) return false;
  return raw.includes("/transform/thumbnail") || (raw.includes("width=96") && raw.includes("height=96"));
}

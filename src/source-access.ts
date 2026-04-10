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

    const token = await this.deps.getAccessToken();
    return this.deps.hydrateTrackStreamUrl(token, track, {
      force: Boolean(options.forceRefresh),
      childrenEndpoint: String(source.childrenEndpoint || ""),
    });
  }
}

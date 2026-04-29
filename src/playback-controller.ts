import { Player } from "./player.js";
import { PlaylistController } from "./playlist.js";

type PlaybackControllerOptions = {
  video: HTMLVideoElement;
  fullscreenHost: HTMLElement | null;
  state: Record<string, any>;
  sourceAccess: any;
  getActiveTracks: () => any[];
  getActiveSource: () => any;
  getDefaultSource: () => any;
  findSourceById: (sourceId: string) => any;
  findTrackFromSourceById: (source: any, trackId: string) => any;
  withTrackSourceMetadata: (track: any, source: any) => any;
  cacheHydratedTrackForSource: (sourceId: string, track: any) => void;
  setInlineLoading: (visible: boolean, text?: string) => void;
  setNowPlayingText: (text: string) => void;
  updateAppTitle: () => void;
  updatePlaybackProgress: (currentTime?: number, duration?: number) => void;
  persistAndRender: () => void;
  saveState: () => void;
  alert: (message: string) => void;
  logError: (error: unknown) => void;
};

export class PlaybackController {
  private player: Player;
  private playlist: PlaylistController;
  private options: PlaybackControllerOptions;
  private isRecoveringSource = false;
  private lastRecoveryAt = 0;
  private isScrubbing = false;

  constructor(options: PlaybackControllerOptions) {
    this.options = options;
    this.player = new Player(options.video, options.fullscreenHost);
    this.playlist = new PlaylistController();
  }

  pause(): void {
    this.player.pause();
  }

  clearLoadedSource(): void {
    this.options.video.removeAttribute("src");
    this.options.video.load();
  }

  togglePlay(): Promise<void> {
    return this.player.togglePlay();
  }

  setVolume(volume: number): void {
    this.player.setVolume(volume);
  }

  setMuted(muted: boolean): void {
    this.player.setMuted(muted);
  }

  setPlaybackRate(rate: number): void {
    this.player.setPlaybackRate(rate);
  }

  async toggleFullscreen(): Promise<boolean> {
    return this.player.toggleFullscreen();
  }

  isFullscreen(): boolean {
    return this.player.isFullscreen();
  }

  setScrubbing(value: boolean): void {
    this.isScrubbing = value;
  }

  shouldUpdateProgressInput(): boolean {
    return !this.isScrubbing;
  }

  syncPlayerPrefs(): void {
    const { state } = this.options;
    this.player.setVolume(state.prefs.volume);
    this.player.setMuted(state.prefs.muted);
    this.player.setPlaybackRate(state.prefs.playbackRate);
  }

  seekBy(seconds: number): void {
    const { state, video, updatePlaybackProgress, saveState } = this.options;
    const duration = Number.isFinite(video.duration) ? video.duration : 0;
    if (duration <= 0) return;
    const nextTime = Math.min(duration, Math.max(0, video.currentTime + seconds));
    video.currentTime = nextTime;
    state.playback.currentTime = nextTime;
    updatePlaybackProgress(nextTime, duration);
    saveState();
  }

  async startPlayback(trackId: string, fromTime = 0, opts: Record<string, any> = {}): Promise<void> {
    const {
      state,
      sourceAccess,
      getActiveSource,
      getDefaultSource,
      findSourceById,
      findTrackFromSourceById,
      withTrackSourceMetadata,
      cacheHydratedTrackForSource,
      setInlineLoading,
      setNowPlayingText,
      updateAppTitle,
      updatePlaybackProgress,
      persistAndRender,
      alert,
      logError,
    } = this.options;
    const { showInlineLoading = false, autoplay = true, silentError = false, forceRefresh = false } = opts;

    state.playback.currentId = trackId;
    state.playback.currentTime = fromTime;

    this.syncPlaylistController();
    const current = this.playlist.setCurrentById(trackId);
    if (!current) {
      setNowPlayingText("找不到影片，可能已被移除。");
      updateAppTitle();
      persistAndRender();
      return;
    }

    let playable = current;
    try {
      setInlineLoading(showInlineLoading, "讀取影片中...");
      const targetSourceId = current?.sourceId || current?.localSourceId;
      const targetSource = findSourceById(targetSourceId) || getActiveSource() || getDefaultSource();
      const sourceTrack =
        findTrackFromSourceById(targetSource, current.id) || withTrackSourceMetadata(current, targetSource);
      playable = await sourceAccess.resolvePlayableTrack(targetSource, sourceTrack, {
        forceRefresh,
      });
      if (targetSource?.type !== "local") {
        cacheHydratedTrackForSource(targetSource.id, playable);
      }
    } catch (error) {
      if (!silentError) logError(error);
      if (!silentError) alert(`無法播放此影片：${error instanceof Error ? error.message : String(error)}`);
      return;
    } finally {
      setInlineLoading(false);
    }

    if (!playable.streamUrl) {
      if (!silentError) alert("此影片目前無法取得可播放連結。");
      return;
    }

    this.player.load(playable, fromTime);
    setNowPlayingText(playable.name);
    updateAppTitle();
    updatePlaybackProgress(fromTime, this.options.video.duration || 0);
    persistAndRender();

    if (!autoplay) return;
    try {
      await this.player.play();
    } catch {
      // Browser autoplay policies may require a user gesture.
    }
  }

  async playNext(): Promise<void> {
    this.syncPlaylistController();
    const next = this.playlist.next();
    if (!next) return;
    await this.startPlayback(next.id, 0, { showInlineLoading: true, autoplay: true });
  }

  async playPrev(): Promise<void> {
    this.syncPlaylistController();
    const prev = this.playlist.prev();
    if (!prev) return;
    await this.startPlayback(prev.id, 0, { showInlineLoading: true, autoplay: true });
  }

  async recoverCurrentPlayback(): Promise<void> {
    const { state, video } = this.options;
    const now = Date.now();
    if (this.isRecoveringSource || now - this.lastRecoveryAt < 4000) return;
    if (!state.playback.currentId) return;
    this.isRecoveringSource = true;
    this.lastRecoveryAt = now;
    const resumeAt = video.currentTime || state.playback.currentTime || 0;
    try {
      await this.startPlayback(state.playback.currentId, resumeAt, {
        showInlineLoading: true,
        autoplay: true,
        silentError: true,
        forceRefresh: true,
      });
    } finally {
      this.isRecoveringSource = false;
    }
  }

  private syncPlaylistController(): void {
    const { state, getActiveTracks } = this.options;
    const active = getActiveTracks();
    this.playlist.setTracks(active);
    this.playlist.toggleShuffle(state.prefs.shuffle);
    this.playlist.setRepeatMode(state.prefs.repeatMode);
    if (state.playback.currentId) {
      this.playlist.setCurrentById(state.playback.currentId);
    }
  }
}

type TrackLike = {
  streamUrl?: string;
};

export class Player {
  private video: HTMLVideoElement;
  private fullscreenHost: HTMLElement;

  constructor(videoEl: HTMLVideoElement, fullscreenHost: HTMLElement | null = null) {
    this.video = videoEl;
    this.fullscreenHost = fullscreenHost || videoEl;
  }

  load(track: TrackLike, startAt = 0): void {
    if (!track?.streamUrl) return;
    this.video.src = track.streamUrl;
    this.video.load();
    if (startAt > 0) {
      this.video.addEventListener(
        "loadedmetadata",
        () => {
          this.video.currentTime = Math.min(startAt, this.video.duration || startAt);
        },
        { once: true }
      );
    }
  }

  play(): Promise<void> {
    return this.video.play();
  }

  pause(): void {
    this.video.pause();
  }

  togglePlay(): Promise<void> {
    if (this.video.paused) return this.play();
    this.pause();
    return Promise.resolve();
  }

  setVolume(volume: number): void {
    this.video.volume = Math.max(0, Math.min(1, volume));
  }

  setMuted(muted: boolean): void {
    this.video.muted = Boolean(muted);
  }

  setPlaybackRate(rate: number): void {
    this.video.playbackRate = rate;
  }

  async toggleFullscreen(): Promise<boolean> {
    const doc = document;
    if (doc.fullscreenElement === this.fullscreenHost) {
      await doc.exitFullscreen();
      return false;
    }
    await this.fullscreenHost.requestFullscreen();
    return true;
  }

  isFullscreen(): boolean {
    return document.fullscreenElement === this.fullscreenHost;
  }
}

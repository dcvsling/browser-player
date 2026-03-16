export class Player {
  constructor(videoEl, fullscreenHost = null) {
    this.video = videoEl;
    this.fullscreenHost = fullscreenHost || videoEl;
  }

  load(track, startAt = 0) {
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

  play() {
    return this.video.play();
  }

  pause() {
    this.video.pause();
  }

  togglePlay() {
    if (this.video.paused) return this.play();
    this.pause();
    return Promise.resolve();
  }

  setVolume(volume) {
    this.video.volume = Math.max(0, Math.min(1, volume));
  }

  setMuted(muted) {
    this.video.muted = Boolean(muted);
  }

  setPlaybackRate(rate) {
    this.video.playbackRate = rate;
  }

  async toggleFullscreen() {
    const doc = document;
    if (doc.fullscreenElement === this.fullscreenHost) {
      await doc.exitFullscreen();
      return false;
    }
    await this.fullscreenHost.requestFullscreen();
    return true;
  }

  isFullscreen() {
    return document.fullscreenElement === this.fullscreenHost;
  }
}

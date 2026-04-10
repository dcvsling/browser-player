type TrackLike = {
  id: string;
  [key: string]: unknown;
};

function createShuffleBag(length: number, currentIndex: number): number[] {
  const pool: number[] = [];
  for (let i = 0; i < length; i += 1) {
    if (i !== currentIndex) pool.push(i);
  }
  for (let i = pool.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool;
}

export class PlaylistController {
  private tracks: TrackLike[] = [];
  private currentIndex = -1;
  private shuffle = false;
  private repeatMode: "off" | "one" | "all" = "off";
  private shuffleBag: number[] = [];
  private history: number[] = [];

  setTracks(tracks: TrackLike[]): void {
    const nextTracks = Array.isArray(tracks) ? tracks : [];
    const changed = hasTrackChanged(this.tracks, nextTracks);
    this.tracks = nextTracks;
    if (this.currentIndex >= this.tracks.length) this.currentIndex = -1;
    if (changed) {
      this.history = [];
      this.resetShuffleBag();
    }
  }

  setCurrentById(id: string): TrackLike | null {
    const idx = this.tracks.findIndex((track) => track.id === id);
    if (idx < 0) {
      this.currentIndex = -1;
      this.history = [];
      this.resetShuffleBag();
      return null;
    }
    if (idx === this.currentIndex) return this.getCurrent();
    if (this.currentIndex >= 0) this.history.push(this.currentIndex);
    this.currentIndex = idx;
    this.resetShuffleBag();
    return this.getCurrent();
  }

  setCurrentByIndex(index: number): TrackLike | null {
    if (index < 0 || index >= this.tracks.length) return null;
    if (index === this.currentIndex) return this.getCurrent();
    if (this.currentIndex >= 0) this.history.push(this.currentIndex);
    this.currentIndex = index;
    this.resetShuffleBag();
    return this.getCurrent();
  }

  getCurrent(): TrackLike | null {
    if (this.currentIndex < 0 || this.currentIndex >= this.tracks.length) {
      return null;
    }
    return this.tracks[this.currentIndex];
  }

  toggleShuffle(forceValue?: boolean): boolean {
    const nextValue = typeof forceValue === "boolean" ? forceValue : !this.shuffle;
    if (nextValue === this.shuffle) return this.shuffle;
    this.shuffle = nextValue;
    this.history = [];
    this.resetShuffleBag();
    return this.shuffle;
  }

  cycleRepeatMode(): "off" | "one" | "all" {
    const modes: Array<"off" | "one" | "all"> = ["off", "one", "all"];
    const idx = modes.indexOf(this.repeatMode);
    this.repeatMode = modes[(idx + 1) % modes.length];
    return this.repeatMode;
  }

  setRepeatMode(mode: "off" | "one" | "all"): void {
    if (["off", "one", "all"].includes(mode)) {
      this.repeatMode = mode;
    }
  }

  prev(): TrackLike | null {
    if (this.tracks.length === 0) return null;
    if (this.shuffle) {
      const previousIndex = this.history.pop();
      if (previousIndex === undefined) return null;
      this.currentIndex = previousIndex;
      this.resetShuffleBag();
      return this.getCurrent();
    }
    if (this.currentIndex <= 0) {
      if (this.repeatMode === "all") {
        this.currentIndex = this.tracks.length - 1;
      } else {
        return null;
      }
    } else {
      this.currentIndex -= 1;
    }
    this.resetShuffleBag();
    return this.getCurrent();
  }

  next(): TrackLike | null {
    if (this.tracks.length === 0) return null;

    if (this.repeatMode === "one" && this.currentIndex >= 0) {
      return this.getCurrent();
    }

    if (this.shuffle) {
      if (this.currentIndex >= 0) this.history.push(this.currentIndex);
      if (this.shuffleBag.length === 0) {
        if (this.repeatMode === "all") {
          this.resetShuffleBag();
        } else {
          return null;
        }
      }

      const nextIndex = this.shuffleBag.shift();
      if (nextIndex === undefined) return null;
      this.currentIndex = nextIndex;
      return this.getCurrent();
    }

    const nextIndex = this.currentIndex + 1;
    if (nextIndex >= this.tracks.length) {
      if (this.repeatMode === "all") {
        this.currentIndex = 0;
      } else {
        return null;
      }
    } else {
      this.currentIndex = nextIndex;
    }
    return this.getCurrent();
  }

  private resetShuffleBag(): void {
    this.shuffleBag = this.shuffle ? createShuffleBag(this.tracks.length, this.currentIndex) : [];
  }
}

function hasTrackChanged(prevTracks: TrackLike[], nextTracks: TrackLike[]): boolean {
  if (prevTracks.length !== nextTracks.length) return true;
  for (let i = 0; i < prevTracks.length; i += 1) {
    if (prevTracks[i]?.id !== nextTracks[i]?.id) return true;
  }
  return false;
}

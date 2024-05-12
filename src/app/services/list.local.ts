
import { Injectable, InjectionToken, Provider } from "@angular/core";
import { VideoMetadata } from "../../graph";

export interface VideoListAccessor {
  readonly current: VideoList;
}

export const VideoListAccessor = new InjectionToken<VideoListAccessor>('VideoListAccessor');
const CURRENT = Symbol.for('current');
@Injectable({
  providedIn: 'root',
  useFactory(): VideoSet {
    return new VideoSet();
  }
})
export class VideoSet implements VideoListAccessor {
  private _lists: { [name: string | symbol ]: VideoList } = {}
  get current(): VideoList { return this._lists[CURRENT] ??= new VideoList(this); };
  constructor() {
    document.addEventListener('unload', () => {
      localStorage.setItem('video-lists', JSON.stringify(this._lists));
    })
    const data = localStorage.getItem('video-lists');
    if(data) {
      JSON.parse(data, (key, value) => {
        if(value instanceof VideoList)
        {
          const { name, videos } = value;
          this._lists[key] = new VideoList(this, name, videos);
        }
      })
    }
  }
  create(name: string, isCurrent: string): VideoList {
    const list = new VideoList(this);
    list.setName(name);
    this._lists[name] = list;
    if(isCurrent)
      this._lists['curren'] = list;
    return list;
  }

  save() {
    localStorage.setItem('video-lists', JSON.stringify(this._lists));
  }

  toJson(): string {
    return JSON.stringify(this._lists);
  }
}


export const VIDEO_LIST_ACEESSOR_PROVIDER: Provider = {
  provide: VideoListAccessor, useExisting: VideoSet
};

export class VideoList {
  private cursor: number = -1;
  constructor(private vs: VideoSet, private _name: string = '', public videos: VideoMetadata[] = []) { }
  get name(): string { return this._name; }
  setName(name: string) {
    this._name = name;
  }
  append(video: VideoMetadata) {
    this.videos.push(video);
    this.vs.save();
  }
  next(): VideoMetadata {
    return this.find(++this.cursor);
  }
  find(index: number): VideoMetadata {
    return this.videos[index];
  }
  remove(metadata: VideoMetadata) {
    this.videos.splice(this.videos.indexOf(metadata), 1);
    this.vs.save();
  }
  toJson(): string {
    return JSON.stringify({ name: this._name, videos: this.videos });
  }

  static [Symbol.hasInstance](instance: any): instance is VideoList {
    return typeof instance === 'object' &&
    ['name', 'videos'].every(prop => prop in instance) &&
    typeof instance.name === 'string' &&
    Array.isArray(instance.videos) &&
    instance.videos.every((video: any) =>
      typeof video === 'object' &&
      ['@microsoft.graph.downloadUrl', 'video'].every(key => key in video));
  }
}



import { Injectable, InjectionToken, Provider } from "@angular/core";
import { VideoMetadata } from "../../graph";

export interface VideoListAccessor {
  readonly current: VideoList;
}

export const VideoListAccessor = new InjectionToken<VideoListAccessor>('VideoListAccessor');
const CACHE_NAME = 'video-set';
const CURRENT_NAME = 'current';
const TEMP_LIST_NAME = 'temp';
@Injectable({
  providedIn: 'root',
  useValue: new VideoSet()
})
export class VideoSet implements VideoListAccessor {
  private _lists: { [name: string]: VideoList } = {}
  private currentName: string = TEMP_LIST_NAME;
  get current(): VideoList { return this._lists[this.currentName] ??= new VideoList(); };
  constructor() {
    document.addEventListener('unload', () => this.save())
    const data = localStorage.getItem(CACHE_NAME);
    if(data) {
      JSON.parse(data, (key, value) => {
        if(value[CURRENT_NAME]) {
          this.currentName = value[CURRENT_NAME];
        }
        if(value instanceof VideoList)
          this._lists[key] = new VideoList();

      })
    }
  }
  private stringifySet(key: PropertyKey, value: any): any {
    if(this.currentName in value) {
      return this.currentName;
    }
    return 'toJson' in value ? value.toJson() : JSON.stringify(value);
  }
  create(name: string, isCurrent: string): VideoList {
    const list = new VideoList();
    list.setName(name);
    this._lists[name] = list;
    if(isCurrent)
      this.currentName = name;
    return list;
  }

  save() {
    localStorage.setItem(CACHE_NAME, this.toJson());
  }

  toJson(): string {
    return JSON.stringify(this._lists, this.stringifySet.bind(this));
  }
}


export const VIDEO_LIST_ACEESSOR_PROVIDER: Provider = {
  provide: VideoListAccessor, useExisting: VideoSet
};

export class VideoList implements Iterable<VideoMetadata> {
  private cursor: number = -1;
  private _name: string = '';
  private videos: VideoMetadata[] = [];
  constructor({ name = '', videos = [] } : { name: string, videos: VideoMetadata[] } = { name: '', videos: [] }) {
    this._name = name;
    this.videos = videos;
  }
  [Symbol.iterator](): Iterator<VideoMetadata, any, undefined> {
    return this.videos.values();
  }
  get name(): string { return this._name; }
  setName(name: string) {
    this._name = name;
  }
  append(video: VideoMetadata) {
    this.videos.push(video);
  }
  next(): VideoMetadata;
  next(current: VideoMetadata): VideoMetadata;
  next(index: number): VideoMetadata;
  next(index?: number | VideoMetadata): VideoMetadata {
    return typeof index === 'object' ? this.videos[this.videos.indexOf(index) + 1]
      : index ? this.find(this.cursor = index) 
      : this.find(++this.cursor);
  }
  find(index: number): VideoMetadata {
    return this.videos[index];
  }
  remove(metadata: VideoMetadata) {
    this.videos.splice(this.videos.indexOf(metadata), 1);
  }
  exist(metadata: VideoMetadata ): boolean{
    return !!this.videos.find(x => x.id === metadata.id);
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

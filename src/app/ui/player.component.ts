import { Configuration } from '@azure/msal-browser';

import { Component, InputSignal, OnInit, Signal, WritableSignal, effect, inject, input, signal } from "@angular/core";
import { VideoMetadata } from "../../graph";
import { VideoList, VideoListAccessor } from "../services/list.local";

export interface Context<T> {
  $implicit: T;
}


@Component({
  selector: 'web-player',
  standalone: true,
  template: `
    <video controls (ended)="src.set(current.next())">
      <source [src]="src()?.['@microsoft.graph.downloadUrl']" type="video/mp4">
      <a [href]="src()?.['@microsoft.graph.downloadUrl']">{{ src()?.name }}</a>
    </video>
  `
})
export class PlayerComponent implements OnInit {
  // inputSrc: InputSignal<VideoMetadata | undefined> = input<VideoMetadata | undefined>(undefined, { alias: 'src' });
  _list: VideoList = inject(VideoListAccessor).current;
  get current(): VideoList { return this._list }
  src: WritableSignal<VideoMetadata | undefined> = signal(undefined);
  constructor() {

  }
  ngOnInit(): void {
  }
}



import { ChangeDetectorRef, Component, ElementRef, EmbeddedViewRef, OnInit, Signal, WritableSignal, computed, effect, inject, signal, viewChild } from "@angular/core";
import { VideoSource } from "../../graph";
import { NgFor } from '@angular/common';
import { MatSidenavModule } from "@angular/material/sidenav";
import { LocalStorageRef } from "../services/list.local";
import { VIDEO_LIST_CACHE } from "../services/video.datasource";
import { transcode } from "../../ffmpeg";

export interface Context<T> {
  $implicit: T;
}

// @Directive({
//   selector: 'video',
//   standalone: true
// })
// export class VideoDirective implements OnInit {
//   template: TemplateRef<Context<VideoSource>> = inject(TemplateRef);
//   src: Signal<VideoSource> = input.required();
//   set metadata(data: VideoSource) {
//     const el = this.video();
//     if(!el) return;
//     if(el.played) el.pause();
//     el.src = data["@microsoft.graph.downloadUrl"] ?? '';
//   }
//   video: Signal<HTMLVideoElement | undefined> = computed(() => this.view?.rootNodes[0]);
//   private view?: EmbeddedViewRef<Context<VideoSource>>;
//   ngOnInit() {
//     this.view = this.template.createEmbeddedView({ $implicit: this.src() });
//   }
// }


@Component({
  selector: 'web-player',
  standalone: true,
  imports: [NgFor, MatSidenavModule],
  template: `
    <mat-drawer-container autosize>
      <mat-drawer mode="side" [opened]="opened()" (openedChange)="opened.set($event)" >
        <ul>
          <li *ngFor="let video of list" (click)="itemClick(video)">
            <span>{{ video.title }}</span>
          </li>
        </ul>
      </mat-drawer>
      <mat-drawer-content (click)="toggleDrawer()">
        <video #player controls (ended)="onEnded()" autoplay></video>
      </mat-drawer-content>
    </mat-drawer-container>
`,
  styles: [`
    video {
      width: 100%;
      height: 100%;
    }
    mat-drawer {
      width: 15%;
      height: 100%;
    }
    mat-drawer-container {
      width: 100%;
      height: 100%;
    }
  `]
})
export class PlayerComponent implements OnInit  {
  opened: WritableSignal<boolean> = signal(true);
  index: WritableSignal<number> = signal(0);
  current: WritableSignal<VideoSource | undefined> = signal(undefined);
  vplayer: Signal<ElementRef<HTMLVideoElement>> = viewChild.required('player');
  player: Signal<HTMLVideoElement> = computed(() => this.vplayer().nativeElement);
  list: LocalStorageRef<VideoSource> = new LocalStorageRef<VideoSource>(VIDEO_LIST_CACHE);
  viewMap: { [key: string]: EmbeddedViewRef<Context<VideoSource>> } = {};
  constructor() {
    effect(() => this.player().src = this.current()!.src, { allowSignalWrites: true });
  }
  ngOnInit(): void {
  }
  onEnded() {
    this.itemClick(this.list[(this.list.indexOf(this.current()!) + 1) % this.list.length]);
  }

  itemClick(video: VideoSource) {
    if(!this.player())
      return;
    this.current.set(video);
  }
  toggleDrawer() {
    this.opened.update(x => !x);
  }
}

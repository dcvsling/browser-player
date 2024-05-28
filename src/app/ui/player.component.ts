

import { AfterViewChecked, ChangeDetectorRef, Component, Directive, ElementRef, EmbeddedViewRef, OnInit, Signal, TemplateRef, ViewContainerRef, WritableSignal, computed, contentChild, effect, inject, input, signal, untracked, viewChild } from "@angular/core";
import { VideoMetadata } from "../../graph";
import { VideoListAccessor } from "../services/list.local";
import { NgFor, NgIf } from '@angular/common';
import { MatSidenavModule } from "@angular/material/sidenav";

export interface Context<T> {
  $implicit: T;
}

// @Directive({
//   selector: 'video',
//   standalone: true
// })
// export class VideoDirective implements OnInit {
//   template: TemplateRef<Context<VideoMetadata>> = inject(TemplateRef);
//   src: Signal<VideoMetadata> = input.required();
//   set metadata(data: VideoMetadata) {
//     const el = this.video();
//     if(!el) return;
//     if(el.played) el.pause();
//     el.src = data["@microsoft.graph.downloadUrl"] ?? '';
//   }
//   video: Signal<HTMLVideoElement | undefined> = computed(() => this.view?.rootNodes[0]);
//   private view?: EmbeddedViewRef<Context<VideoMetadata>>;
//   ngOnInit() {
//     this.view = this.template.createEmbeddedView({ $implicit: this.src() });
//   }
// }


@Component({
  selector: 'web-player',
  standalone: true,
  imports: [NgIf, NgFor, MatSidenavModule],
  template: `
    <mat-drawer-container autosize>
      <mat-drawer mode="side" [opened]="opened()" (openedChange)="opened.set($event)" >
        <ul>
          <li *ngFor="let video of accessor.current" (click)="itemClick(video)">
            <span>{{ video.name }}</span>
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
  cdf: ChangeDetectorRef = inject(ChangeDetectorRef); 
  opened: WritableSignal<boolean> = signal(true);
  accessor: VideoListAccessor = inject(VideoListAccessor);
  index: WritableSignal<number> = signal(0);
  current: WritableSignal<VideoMetadata | undefined> = signal(undefined);
  player: Signal<ElementRef<HTMLVideoElement>> = viewChild.required('player');
  // container: Signal<ViewContainerRef> = viewChild.required("content", { read: ViewContainerRef } );
  viewMap: { [key: string]: EmbeddedViewRef<Context<VideoMetadata>> } = {};
  constructor() {}

  ngOnInit(): void {
  }
  onEnded() {
    this.itemClick(this.accessor.current.next());
  }

  itemClick(video: VideoMetadata) {
    if(!this.player()) 
      return;
    this.player().nativeElement.src = video["@microsoft.graph.downloadUrl"];
  }
  toggleDrawer() {
    this.opened.update(x => !x);
  }


}



import { Component, ElementRef, EmbeddedViewRef, OnInit, Signal, WritableSignal, computed, effect, inject, signal, viewChild } from "@angular/core";
import { DriveClient, VideoSource } from "../../graph";
import { NgFor } from '@angular/common';
import { MatSidenavModule } from "@angular/material/sidenav";
import { WAITING_FOR_PLAYER, LocalStorageRef } from "../../data";
import { MatIconModule } from "@angular/material/icon";
import { KeyEvent } from "../../inputs/KeyEvent";
import { ActivatedRoute, Router, RouterModule } from "@angular/router";

export interface Context<T> {
  $implicit: T;
}

@Component({
  standalone: true,
  imports: [NgFor, MatSidenavModule, MatIconModule, RouterModule],
  template: `
    <div class="video-player" tabindex="0">
      <video #player muted playsInline autoplay controls controlsList
        [src]="sourceUrl()"
        (ended)="onEnded()"
        (canplay)="player.play()"></video>
    </div>
    <div #menu class="right-menu">
      <div class="side-item" (click)="toggle()"><span></span><mat-icon class="icon">{{ 'keyboard_double_arrow_' + (opened() ? 'right' : 'left') }}</mat-icon></div>
      <div *ngFor="let video of list; let i = index" class="menu-item" (click)="itemClick(video)">
        <img [src]="video" [alt]="video.title" />
        <div class="title">{{ video.title }}</div>
      </div>
    </div>
`,
  styles: [`
    :host {
      display: flex;
      height: 100%;
      width: 100%;
      overflow: hidden;             /* 隱藏摺疊時多餘文字 */
    }
    .right-menu {
      top: 0;
      right: 0;
      height: 100vh;
      width: 300px;
      background-color: #333;       /* 深灰底 */
      overflow-y: auto;             /* 允許滾動 */
      transition: width 0.3s ease;
      scrollbar-width: none;        /* Firefox */
      &::-webkit-scrollbar {
        width: 0;
        height: 0;
      };
      &.collapsed {
        width: 60px;               /* 只留縮圖寬度 */
        & .menu-item .title {
          opacity: 0;                    /* 隱藏標題 */
          width: 0;
          padding: 0;
          margin: 0;
        }
      };
      & .menu-item {
        display: flex;
        align-items: center;
        padding: 2px, 0px;
        color: #ffffff;
        cursor: pointer;
        &.active {
          background-color: #333;
          color: #ffffff;
        }
        & img {
          width: 48px;
          height: 48px;
          object-fit: cover;
          border-radius: 4px;
          margin-right: 12px;
        };
        & .title {
          font-size: 12px;
          white-space: nowrap;
          transition: opacity 0.3s ease;
          overflow: hidden;
          text-overflow: ellipsis;
        }
      }
    }
    .video-player {
      display: block;
      width: 100%;
      height: 100%;
      & video {
        width: 100%;
        height: 100%;
        object-fit: cover;
        background-color: black;
      }
    }
  `]
})
export class PlayListComponent implements OnInit  {
  opened: WritableSignal<boolean> = signal(false);
  index: WritableSignal<number> = signal(0);
  menu: Signal<ElementRef<HTMLDivElement>> = viewChild.required('menu');
  list: LocalStorageRef<VideoSource>= inject(WAITING_FOR_PLAYER);
  current: WritableSignal<VideoSource | undefined> = signal(undefined);
  sourceUrl: WritableSignal<string> = signal('');
  viewMap: { [key: string]: EmbeddedViewRef<Context<VideoSource>> } = {};
  _video: Signal<ElementRef<HTMLVideoElement>> = viewChild.required('player');
  player: Signal<HTMLVideoElement> = computed(() => this._video().nativeElement);
  cursor: WritableSignal<number> = signal(1);
  drive: DriveClient = inject(DriveClient);
  activatedRoute = inject(ActivatedRoute);
  router = inject(Router);
  getInstance(): PlayListComponent {
    return this;
  }
  constructor() {
    effect(() => this.current.set(this.list[this.cursor() - 1]));
    effect(() => this.opened() ? this.menu().nativeElement.classList.remove('collapsed') : this.menu().nativeElement.classList.add('collapsed'));
    effect(() => {
      const video = this.current();
      if(video)
        this.drive.getSource(video).subscribe(url => this.sourceUrl.set(url));
    })

  }
  ngOnInit(): void {
    this.activatedRoute.paramMap.subscribe(params => {
      const index = Number(params.get('index'));
      if(index >= 0 && index < this.list.length) {
        this.cursor.set(index);
      }
    });
  }
  onEnded() {
    this.current.set(this.list[(this.list.indexOf(this.current()!) + 1) % this.list.length]);
  }
  itemClick(video: VideoSource) {
    this.current.set(video);
  }
  toggle() {
    this.opened.update(x => !x);
  }
  @KeyEvent('ArrowLeft')
  forward() {
    const player = this.getInstance().player();
    player.currentTime = (player.duration - player.currentTime < 5000) ? player.duration : player.currentTime + 5000
  }
  @KeyEvent('ArrowRight')
  backward() {
    const player = this.getInstance().player();
    player.currentTime = player.currentTime < 5000 ? 0 : player.currentTime - 5000;
  }
  @KeyEvent('ArrowUp')
  last() {
    const self = this.getInstance();
    self.router.navigate(['play', self.cursor() - 1]);
  }
  @KeyEvent('ArrowDown')
  next() {
    const self = this.getInstance();
    self.router.navigate(['play', self.cursor() + 1]);
  }
  @KeyEvent('Space')
  togglePlay() {
    const self = this.getInstance();
    self.player().paused ? self.player().play() : self.player().pause();
  }
}

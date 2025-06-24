

import { Component, HostListener, ElementRef, Signal, WritableSignal, computed, effect, inject, signal, viewChild } from "@angular/core";
import { DriveClient, VideoSource } from "../../graph";
import { MatSidenavModule } from "@angular/material/sidenav";
import { WAITING_FOR_PLAYER, LocalStorageRef, ExistSource } from "../../data";
import { MatIconModule } from "@angular/material/icon";
import { Scrollable } from "./scrollable.directive";
import { ImageDirective } from "./image.directive";


@Component({
  standalone: true,
  imports: [MatSidenavModule, MatIconModule, Scrollable, ImageDirective],
  template: `
    <div class="video-player" tabindex="0">
      <video #player muted playsInline autoplay controls controlsList
        [src]="sourceUrl()"
        (ended)="onEnded()"
        (canplay)="player.play()"></video>
    </div>
    <div #menu class="right-menu">
      <div class="side-item" (click)="toggle()"><span></span><mat-icon class="icon">{{ 'keyboard_double_arrow_' + (opened() ? 'right' : 'left') }}</mat-icon></div>
      <div class="shuffle-item" (click)="shuffle()"><mat-icon class="icon">shuffle</mat-icon></div>
      <div *scrollable="let video of sourceList" class="menu-item" (click)="itemClick(video)">
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
export class PlayListComponent {
  opened: WritableSignal<boolean> = signal(false);
  menu: Signal<ElementRef<HTMLDivElement>> = viewChild.required('menu');
  list: LocalStorageRef<VideoSource> = inject(WAITING_FOR_PLAYER);
  sourceList: ExistSource<VideoSource> = new ExistSource(this.list);
  current: WritableSignal<VideoSource | undefined> = signal(undefined);
  sourceUrl: WritableSignal<string> = signal('');
  _video: Signal<ElementRef<HTMLVideoElement>> = viewChild.required('player');
  player: Signal<HTMLVideoElement> = computed(() => this._video().nativeElement);
  cursor: WritableSignal<number> = signal(1);
  drive: DriveClient = inject(DriveClient);
  constructor() {
    effect(() => this.current.set(this.list[this.cursor() - 1]));
    effect(() => this.opened() ? this.menu().nativeElement.classList.remove('collapsed') : this.menu().nativeElement.classList.add('collapsed'));
    effect(() => {
      const video = this.current();
      if(video)
        this.drive.getSource(video).subscribe(url => this.sourceUrl.set(url));
    });
  }
  async getImage(source: VideoSource): Promise<string | undefined> {
    return await this.drive.getThumbnail(source, "large");
  }

  onEnded() {
    this.next();
  }
  itemClick(video: VideoSource) {
    this.current.set(video);
  }
  toggle() {
    this.opened.update(x => !x);
  }
  shuffle() {
    this.list.sort(() => Math.random() - 0.5);
    this.cursor.set(1);
  }

  @HostListener('document:keydown', ['$event'])
  onKeydown(e: KeyboardEvent): void {
    switch (e.code) {
      case 'ArrowLeft':
        this.backward();
        break;
      case 'ArrowRight':
        this.forward();
        break;
      case 'ArrowUp':
        this.last();
        break;
      case 'ArrowDown':
        this.next();
        break;
      case 'Space':
        this.togglePlay();
        break;
      default:
        break;
    }
  }

  backward(): void {
    const player = this.player();
    player.currentTime = player.currentTime < 5000 ? 0 : player.currentTime - 5000;
  }

  forward(): void {
    const player = this.player();
    player.currentTime = (player.duration - player.currentTime < 5000) ? player.duration : player.currentTime + 5000;
  }

  last(): void {
    const len = this.list.length;
    const currentIndex = this.cursor() - 1;
    const prevIndex = (currentIndex - 1 + len) % len;
    this.cursor.set(prevIndex + 1);
  }

  next(): void {
    const len = this.list.length;
    const currentIndex = this.cursor() - 1;
    const nextIndex = (currentIndex + 1) % len;
    this.cursor.set(nextIndex + 1);
  }

  togglePlay(): void {
    this.player().paused ? this.player().play() : this.player().pause();
  }
}


import { Component, contentChild, effect, ElementRef, InjectionToken, OnInit, signal, Signal, viewChild, WritableSignal } from '@angular/core';
import { RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { NgClass, NgFor } from '@angular/common';

export const IMAGE_RESIZE_WORKER = new InjectionToken('image resize worker');

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [NgFor, RouterModule, MatButtonModule, MatIconModule],
  template: `
  <div #nav class="side">
    <div class="side-item" (click)="toggle()"><span></span><mat-icon class="icon">{{ 'keyboard_double_arrow_' + (isopen() ? 'left' : 'right') }}</mat-icon></div>
    <div *ngFor="let route of routes" class="side-item" [routerLink]="route.path"><span>{{route.text}}</span><mat-icon class="icon">{{route.icon}}</mat-icon></div>
  </div>
  <div class="container">
    <router-outlet></router-outlet>
  </div>
  `,
  styles: [`
    :host {
      display: flex;
      height: 100vh;
      width: 100vw;
    }
    .side {
      display: block;
      top: 0;
      left: 0;
      width: 110px;
      height: 100%;
      background-color: #2c2a2a;    /* 深灰底 */
      overflow: hidden;             /* 隱藏摺疊時多餘文字 */
      transition: width 0.3s ease;
      &.collapsed {
        width: 60px !important;
        & .side-item {
          justify-content: center;
          & span {
            opacity: 0;
            width: 0;
          }
          & .icon {
            font-size: 24px;
            color: #cccccc;
          }
        }
      }
      & .side-item {
        display: flex;
        height: 2em;
        width: 100%;
        justify-content: space-between;
        align-items: center;
        padding: 12px 16px;
        color: #ffffff;
        cursor: pointer;
        & span {
          font-size: 16px;
          white-space: nowrap;
          transition: opacity 0.3s ease;
        }
        & .icon {
          font-size: 24px;
          color: #cccccc;
        }
      }
    }
    .container {
      position: relative;
      height: 100%;
      width: 100%;
    }
  `]
})
export class AppComponent implements OnInit {
  isopen: WritableSignal<boolean> = signal(false);
  nav: Signal<ElementRef<HTMLElement>> = viewChild.required('nav');

  constructor() {
    effect(() => this.isopen()
      ? this.nav().nativeElement.classList.remove('collapsed')
      : this.nav().nativeElement.classList.add('collapsed'));
  }
  ngOnInit(): void {

  }
  toggle() {
    this.isopen.update(x => !x);
  }
  routes = [
    { path: ['/play'], icon: 'play_arrow', text: '播放' },
    { path: ['/list'], icon: 'folder', text: '清單' },
  ]
}

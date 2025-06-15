import { Component, ElementRef, InputSignal, WritableSignal, inject, input, signal } from "@angular/core";
import { VideoSource } from "../../graph";
import { MatToolbarModule } from "@angular/material/toolbar";
import { CanvasImageDirective } from "./image.directive";


@Component({
  selector: 'list-item',
  standalone: true,
  imports: [MatToolbarModule, CanvasImageDirective],
  template: `
    <canvas class="img" [image]="source()"></canvas>
    <span class="video-title">{{ source().title }}</span>
    <span class="video-duration">{{ normallizetTime(source().duration) }}</span>`,
  styles: [`
    :host {
      position: relative;
      displdiay: block;
      background-color: #333;
      border-radius: 4px;
      overflow: hidden;
      text-align: center;
      padding: 2px 0px;
      transition: transform 0.2s ease;
      &:hover {
        transform: scale(1.02);
      }
      &.selected {
        padding: 2px;
        transform: scale(0.98);
      }
    }
    .video-duration {
        position: absolute;
        bottom: 4px;
        right: 4px;
        background: rgba(0, 0, 0, 0.7);
        color: #fff;
        padding: 2px 4px;
        font-size: 12px;
        border-radius: 2px;
        line-height: 1;
        pointer-events: none;
        user-select: none;
        opacity: 0;
        :host:hover & {
          opacity: 1;
        }
      }
      .img {
        width: 100%;
        height: auto;
        display: block;
      }
      .video-title {
        position: absolute;
        top: 0px;
        left: 0px;
        background: rgba(0, 0, 0, 0.3);
        color: #fff;
        padding: 0px 0px;
        font-size: 12px;
        text-align: left;
        border-radius: 2px;
        opacity: 0;
        transition: opacity 0.2s ease-in-out;
        pointer-events: none;
        user-select: none;
        :host:hover & {
          opacity: 1;
        }
      }
  `]
})
export class ListItemComponent {
  source: InputSignal<VideoSource> = input.required({ alias: 'item' });
  el: ElementRef<HTMLDivElement> = inject(ElementRef);
  imageUrl: WritableSignal<string> = signal('');

  normallizetTime(time: number): string {
    time = Math.floor(time);
    const ss = time % 60;
    let m = (time - ss) / 60;
    const mm = m % 60;
    const hh = (m - mm) / 60;
    return `${hh.toString().padStart(2, '0')}:${mm.toString().padStart(2, '0')}:${ss.toString().padStart(2, '0')}`;
  }
}

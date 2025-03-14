import { Component, Input, InputSignal, input } from "@angular/core";
import { VideoSource } from "../../graph";
import { NgIf, NgTemplateOutlet } from "@angular/common";
import { MatToolbarModule } from "@angular/material/toolbar";
import { ImageComponent } from "./image.component";
export type ItemMode = 'grid' | 'row';
@Component({
  selector: 'list-item',
  standalone: true,
  imports: [NgIf, NgTemplateOutlet, MatToolbarModule, ImageComponent],
  template: `
    <ng-container *ngTemplateOutlet="!video().thumb ? noThumbnail : mode() === 'row' ? row : grid"></ng-container>

    <ng-template #grid>
      <img-c
        *ngIf="video().thumb.grid.url !== '' else noThumbnail"
        [src]="video().thumb.grid.url"
        [alt]="video().title"
      ></img-c>
    </ng-template>

    <ng-template #row>
      <p>
        <span><img-c [src]="video().thumb.row.url"></img-c></span>
        <span>{{video().title}}</span>
        <span style="float: right">{{normallizetTime(video().size)}}</span>
      </p>
    </ng-template>
    <ng-template #noThumbnail>
      <p>{{video().title}}</p>
    </ng-template>
          `,
  styles: [`
    img {
      overflow: hidden;
      height: 100%;
    }
    p {
      display: grid;
      grid-template-columns: 20% 60% 20%;
      grid-gap: 0px;
      span {
        display: inline;
      }
    }
  `]
})
export class ListItemComponent {
  normallizetTime(time: number): string {
    time = Math.floor(time / 1000);
    const ss = time % 1000;
    const mm = (time - ss) / 60;
    return `${mm}:${ss}`;
  }
  mode: InputSignal<ItemMode> = input.required();
  video: InputSignal<VideoSource> = input.required({ alias: 'item' });

}

import { Component, Input, InputSignal, input } from "@angular/core";
import { VideoMetadata } from "../../graph";
import { NgIf, NgTemplateOutlet } from "@angular/common";
import { MatToolbarModule } from "@angular/material/toolbar";
export type ItemMode = 'grid' | 'row';
@Component({
  selector: 'list-item',
  standalone: true,
  imports: [NgIf, NgTemplateOutlet, MatToolbarModule],
  template: `
    <ng-container *ngTemplateOutlet="video().thumbnails.length === 0 ? noThumbnail : mode() === 'row' ? row : grid"></ng-container>

    <ng-template #grid>
      <img
        *ngIf="video().thumbnails.length !== 0 else noThumbnail"
        [src]="video().thumbnails[0].large.url"
        [alt]="video().name"
        loading="lazy"
        />
    </ng-template>

    <ng-template #row>
      <p>
        <span><img [src]="video().thumbnails[0].small.url" loading="lazy" /></span>
        <span>{{video().name}}</span>
        <span style="float: right">{{normallizetTime(video().video.duration)}}</span>
      </p>
    </ng-template>
    <ng-template #noThumbnail>
      <p>{{video().name}}</p>
    </ng-template>
          `,
  styles: [`
    img {
      overflow: hidden;
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
  video: InputSignal<VideoMetadata> = input.required({ alias: 'item' });

}

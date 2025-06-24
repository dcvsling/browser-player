
import { MatToolbarModule } from '@angular/material/toolbar';
import { ChangeDetectionStrategy, Component, inject } from "@angular/core";
import { VideoSource} from "../../graph";
import { MatGridListModule } from '@angular/material/grid-list';
import { MatListModule } from '@angular/material/list';
import { MatProgressBarModule } from '@angular/material/progress-bar'
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatIconModule } from "@angular/material/icon";
import { LocalStorageRef } from '../../data/list.local';
import { ListItemComponent } from "./listItem.component";
import { VideoDataSource, WAITING_FOR_PLAYER } from '../../data';
import { Scrollable } from './scrollable.directive';



@Component({
  selector: 'grid-list',
  template: `
    <list-item 
      *scrollable="let video of source" 
      [item]="video"
      (click)="itemClick(video)"
      [classList]="playlist.has(video) ? 'selected' : ''" ></list-item>
  `,
  standalone: true,
  imports: [ Scrollable, ListItemComponent, MatListModule, MatToolbarModule, MatButtonToggleModule, MatIconModule, MatSidenavModule, MatGridListModule, MatProgressBarModule, MatPaginatorModule],
  styles: [`
    :host {
      /* margin-top: 20px;*/
      display: grid;
      /* 根據螢幕寬度自動調整橫向欄數 */
      grid-template-columns: repeat(auto-fill, 320px);
      grid-template-rows: repeat(auto-fill, 240px);
      gap: 2px;
      width: 100%;
      height: 100%;
    }
    list-item {
      template-area: item;
      display: 'stick'
    }
    .hide {
      display: none;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ListComponent {
  source: VideoDataSource = inject(VideoDataSource);
  playlist: LocalStorageRef<VideoSource> = inject(WAITING_FOR_PLAYER);
  itemClick(source: VideoSource) {
    if(this.playlist.has(source)) {
      this.playlist.remove(source);
      return;
    }
    this.playlist.add(source);
  }
}



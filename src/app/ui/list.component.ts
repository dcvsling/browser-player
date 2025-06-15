
import { MatToolbarModule } from '@angular/material/toolbar';
import { ChangeDetectionStrategy, Component, ViewContainerRef, inject } from "@angular/core";
import { VideoSource} from "../../graph";
import { MatGridListModule } from '@angular/material/grid-list';
import { MatListModule } from '@angular/material/list';
import { MatProgressBarModule } from '@angular/material/progress-bar'
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatIconModule } from "@angular/material/icon";
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { LocalStorageRef } from '../../data/list.local';
import { ListItemComponent } from "./listItem.component";
import { BehaviorSubject } from 'rxjs';
import { ListRange } from '@angular/cdk/collections';
import { VideoDataSource, WAITING_FOR_PLAYER } from '../../data';
import { Scrollable, ScrollItem } from './scrollable.directive';



@Component({
  selector: 'grid-list',
  template: `
    <div class="grid" [scrollable]="source">
      <list-item
        *scrollItem="let video"
        [item]="video"
        #item
        (click)="itemClick(video)"
        [classList]="playlist.has(video) ? 'selected' : ''" ></list-item>
    </div>
  `,
  standalone: true,
  imports: [ Scrollable, ScrollItem, RouterModule, ListItemComponent, MatListModule, MatToolbarModule, MatButtonToggleModule, MatIconModule, MatSidenavModule, MatGridListModule, MatListModule, MatProgressBarModule, MatPaginatorModule],
  styles: [`
    .grid {
      /* margin-top: 20px;*/
      display: grid;
      /* 根據螢幕寬度自動調整橫向欄數 */
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      grid-template-rows: repeat(auto-fill, minmax(240px, 1fr));
      gap: 1%;
    }
    list-paging {
      display: 'stick'
    }
    .hide {
      display: none;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ListComponent {

  routes: ActivatedRoute = inject(ActivatedRoute);
  // viewList: WritableSignal<VideoSource[]> = signal([]);
  source: VideoDataSource = inject(VideoDataSource);
  playlist: LocalStorageRef<VideoSource> = inject(WAITING_FOR_PLAYER);
  paging: BehaviorSubject<ListRange> = new BehaviorSubject<ListRange>({ start:0, end: 30 });
  router: Router = inject(Router);
  vcf: ViewContainerRef = inject(ViewContainerRef);
  constructor() {
  }
  ngOnInit() {

  }
  itemClick(source: VideoSource) {
    if(this.playlist.has(source)) {
      this.playlist.remove(source);
      return;
    }
    this.playlist.add(source);
  }
}

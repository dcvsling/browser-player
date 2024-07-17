
import { MatToolbarModule } from '@angular/material/toolbar';
import { AsyncPipe, NgIf, NgTemplateOutlet, NgOptimizedImage, NgFor, NgClass  } from "@angular/common";
import { Component, ModelSignal, Signal, WritableSignal, computed, inject, model, signal, viewChild } from "@angular/core";
import { VideoMetadata as metadata} from "../../graph";
import { AuthModule } from "../../auth/providers";
import { MatGridListModule } from '@angular/material/grid-list';
import { MatListModule } from '@angular/material/list';
import { of } from "rxjs";
import { EndOfScrollDirective, ForOf, KeyBindingDirective } from "../../weidges";
import { MatProgressBarModule } from '@angular/material/progress-bar'
import { ItemMode, ListItemComponent } from "./listItem.component";
import { VideoSource } from "../../graph";
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSidenavModule } from '@angular/material/sidenav';
import { PlayerComponent } from "./player.component";
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatIconModule } from "@angular/material/icon";
import { VideoListAccessor } from '../services/list.local';

declare interface VideoMetadata extends metadata{
  selected?: boolean;
}

@Component({
  selector: 'grid-list',
  template: `
    <mat-toolbar>
      <mat-button-toggle-group [hideSingleSelectionIndicator]="true">
        <mat-button-toggle value="grid" (click)="mode.set('grid')"><mat-icon>grid_view</mat-icon></mat-button-toggle>
        <mat-button-toggle value="row" (click)="mode.set('row')"><mat-icon>list</mat-icon></mat-button-toggle>
      </mat-button-toggle-group>

      <mat-paginator #paginat
        class="demo-paginator"
        (page)="handlePageEvent($event)"
        [length]="source.length"
        [pageSize]="[8]"
        [showFirstLastButtons]="true"
        [hidePageSize]="false"
        [pageIndex]="0"
        aria-label="Select page">
    </mat-paginator>
  </mat-toolbar>
  <div [ngClass]="modeClass()" #item>
    <list-item
      #listItem
      *ngFor="let video of current()"
      [item]="video"
      [ngClass]="itemClassMode(video)"
      
      (click)="itemclick(video)"
      [mode]="mode()"
       >
    </list-item>
  </div>

  `,
  standalone: true,
  imports: [NgIf, NgFor, NgClass, MatToolbarModule, MatButtonToggleModule, MatIconModule, PlayerComponent, KeyBindingDirective, MatSidenavModule, EndOfScrollDirective, ListItemComponent, ForOf, NgOptimizedImage , AsyncPipe, AuthModule, MatGridListModule, MatListModule, NgTemplateOutlet, MatProgressBarModule, MatPaginatorModule],
  styles: [`
    mat-toolbar {
      width: 100%;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(4, 25%);
      grid-gap: 0px;
    }
    .row {
      display: block;
      & list-item {
        display: grid;
      }
    }
    mat-toolbar, mat-button-toggle, mat-button-toggle-group  {
      margin: 0;
      padding: 0;
    }
    .hide {
      display: none;
    }
    .list-item {
      margin: 0;
      padding: 0;
      overflow-x: hidden;
      &.active {
        border: 2px solid red;
      }
    }
    .demo-paginator {
      width: 100%;
    }
    `]
})
export class ListComponent {
  modeClass: Signal<string> = computed(() => (this.mode() === 'row' ? 'row' : 'grid') + ' hide-scroll');
  mode: WritableSignal<ItemMode> = signal('grid');
  opened: ModelSignal<boolean> = model(true);
  current: WritableSignal<VideoMetadata[]> = signal([]);
  list: VideoListAccessor = inject(VideoListAccessor);

  constructor(public source: VideoSource) {
  }
  ngOnInit() {
    this.source.connect({ viewChange: of({ start: 0, end: 8 }) })
      .subscribe(data => this.current.set([...data]));
  }

  handlePageEvent(e: PageEvent) {
    this.source.connect({ viewChange: of({ start: e.pageIndex * e.pageSize, end: e.pageIndex * e.pageSize + e.pageSize }) })
      .subscribe(data => this.current.set([...data]));
  }
  itemclick(video: VideoMetadata) {
    video.selected = !(video.selected ?? false);
    this.addToList(video);
  }
  addToList(metadata: VideoMetadata) {
    this.list.current.exist(metadata)
      ? this.list.current.remove(metadata)
      : this.list.current.append(metadata);

  }
  itemClassMode(video: VideoMetadata) {
    return 'list-item ' + (video.selected ? 'active' : '');
  }
}

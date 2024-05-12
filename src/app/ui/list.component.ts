
import { MatToolbarModule } from '@angular/material/toolbar';
import { AsyncPipe, NgIf, NgTemplateOutlet, NgOptimizedImage, NgFor, NgClass  } from "@angular/common";
import { Component, ModelSignal, Signal, WritableSignal, computed, inject, model, signal, viewChild } from "@angular/core";
import { VideoMetadata } from "../../graph";
import { AuthModule } from "../../auth/providers";
import { MatGridListModule } from '@angular/material/grid-list';
import { MatListModule } from '@angular/material/list';
import { of } from "rxjs";
import { EndOfScrollDirective, ForOf, KeyBindingDirective } from "../../weidges";
import { MatProgressBarModule } from '@angular/material/progress-bar'
import { ItemMode, ListItemComponent } from "./listItem.component";
import { VideoSource } from "../../graph/video.datasource";
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSidenavModule } from '@angular/material/sidenav';
import { PlayerComponent } from "./player.component";
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatIconModule } from "@angular/material/icon";
import { VideoListAccessor } from '../services/list.local';
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
  <div [ngClass]="modeClass()" >
    <list-item
      *ngFor="let video of current()"
      [item]="video"
      class="list-item"
      (click)="addToList(video)"
      [mode]="mode()">
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
      list-item {
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
  // current: WritableSignal<VideoMetadata[]> = signal([], { equal: (l, r) => l.length === r.length });
  current: WritableSignal<VideoMetadata[]> = signal([]);
  player: Signal<PlayerComponent> = viewChild.required(PlayerComponent);
  list: VideoListAccessor = inject(VideoListAccessor);

  // source: VideoSource = inject(DataProvider<VideoMetadata[]>);
  // index: WritableSignal<number> = signal(0);
  // count: Signal<number> = computed(() => this.res().count);
  // loadDebonce: WritableSignal<boolean> = signal(false);!
  // private resStack: WritableSignal<LazyLoad<VideoMetadata[]>[]> = signal([]);
  // private res: Signal<LazyLoad<VideoMetadata[]>> = computed(() => this.resStack()[this.index()]);
  constructor(public source: VideoSource) {
  }
  ngAfterContentChecked(): void {

  }
  ngOnInit() {
    this.source.connect({ viewChange: of({ start: 0, end: 8 }) })
      .subscribe(data => this.current.set([...data]));
  }

  handlePageEvent(e: PageEvent) {
    this.source.connect({ viewChange: of({ start: e.pageIndex * e.pageSize, end: e.pageIndex * e.pageSize + e.pageSize }) })
      .subscribe(data => this.current.set([...data]));
  }
  addToList(metadata: VideoMetadata) {
    this.isSelected(metadata)
      ? this.list.current.videos.splice(this.list.current.videos.indexOf(metadata), 1)
      : this.list.current.append(metadata);

  }
  isSelected(metadata: VideoMetadata): boolean {
    return this.list.current.videos.indexOf(metadata) >= 0;
  }
}

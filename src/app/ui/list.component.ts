
import { MatToolbarModule } from '@angular/material/toolbar';
import { NgFor, NgClass  } from "@angular/common";
import { Component, ModelSignal, Signal, WritableSignal, computed, effect, inject, model, signal, viewChild } from "@angular/core";
import { VideoMetadata as metadata, ToViduoSource, VideoSource} from "../../graph";
import { MatGridListModule } from '@angular/material/grid-list';
import { MatListModule } from '@angular/material/list';
import { map, of, tap } from "rxjs";
import { MatProgressBarModule } from '@angular/material/progress-bar'
import { ItemMode, ListItemComponent } from "./listItem.component";
import { VideoDataSource } from "../services/video.datasource";
import { MatPaginator, MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatIconModule } from "@angular/material/icon";
import { ActivatedRoute } from '@angular/router';

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
<!--
      <mat-paginator #paginat
        class="demo-paginator"
        (page)="handlePageEvent($event)"
        [length]="source.length"
        [pageSize]="[this.pageSize()]"
        [showFirstLastButtons]="true"
        [hidePageSize]="false"
        [pageIndex]="0"
        aria-label="Select page">
    </mat-paginator> -->
  </mat-toolbar>
  <div [ngClass]="modeClass()" #item>
    @for (video of current(); track video) {
      <list-item
        #listItem
        [item]="video"
        [ngClass]="itemClassMode(video)"
        (click)="itemclick(video)"
        [mode]="mode()">
      </list-item>
    }
  </div>

  `,
  standalone: true,
  imports: [MatListModule, NgClass, MatToolbarModule, MatButtonToggleModule, MatIconModule, MatSidenavModule, ListItemComponent, MatGridListModule, MatListModule, MatProgressBarModule, MatPaginatorModule],
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
  current: WritableSignal<readonly VideoSource[]> = signal([]);
  source: VideoDataSource = inject(VideoDataSource);
  pageIndex: WritableSignal<number> = signal(0);
  pageSize: WritableSignal<number> = signal(8);
  paging: Signal<MatPaginator> = viewChild.required('paginat');
  activatedRoute: ActivatedRoute = inject(ActivatedRoute);

  constructor() {
    effect(() => this.source.connect({ viewChange: of({ start: this.pageIndex() * this.pageSize(), end: (this.pageIndex() + 1)* this.pageSize() }) })
      .pipe(tap(data => this.current.set(data)))
      .subscribe(), { allowSignalWrites: true });
  }
  ngOnInit() {
    this.activatedRoute.paramMap.pipe(
      map(p => p.has('pageIndex') ? parseInt(p.get('pageIndex')!) : 0),
      tap(this.pageIndex.set)
    ).subscribe();
  }
  handlePageEvent(e: PageEvent) {
    this.pageIndex.set(e.pageIndex);
  }
  itemclick(video: VideoSource) {

  }
  itemClassMode(video: VideoSource) {
    return 'list-item ' + (video ? 'active' : '');
  }
}

import { Component, effect, input, InputSignal, OnInit, output, OutputEmitterRef, signal, WritableSignal } from "@angular/core";
import { MatPaginatorModule, PageEvent } from "@angular/material/paginator";

import { of } from "rxjs";
import { VideoSource } from "../../graph";
import { VideoDataSource } from "../../data";

@Component({
  selector: 'list-paging',
  standalone: true,
  template: `
    <mat-paginator #pagingator
      class="paginator"
      (page)="handlePageEvent($event)"
      [length]="src.length"
      [pageSize]="pageSize()"
      [pageSizeOptions]="pageSizeOptions()"
      [showFirstLastButtons]="true"
      [hidePageSize]="false"
      [pageIndex]="0"
      aria-label="Select page"></mat-paginator>`,
  imports: [MatPaginatorModule],
  styles: [`
    mat-paginator {
      background: rgba(0, 0, 0, 0.7);
      color: #fff;
      background-color: #333;
      border-radius: 4px;
      text-align: center;
      transition: transform 0.2s ease;
      width: 100%;

    }
  `]
})
export class PagingComponent implements OnInit {
  constructor() {
    effect(() => {
      const size = this.pageSize();
      const index = this.pageIndex();
      this.src().connect({ viewChange: of({ start: index * size, end: (index + 1)* size }) })
        .subscribe((data: readonly VideoSource[]) => this.change.emit(data))
    });
  }
  ngOnInit(): void {
  }
  change: OutputEmitterRef<readonly VideoSource[]> = output();
  src: InputSignal<VideoDataSource> = input.required();
  pageIndex: WritableSignal<number> = signal(0);
  pageSizeOptions: WritableSignal<number[]> = signal([20,50,100]);
  pageSize: WritableSignal<number> = signal(this.pageSizeOptions()[0]);
  handlePageEvent(event: PageEvent) {
    this.pageSize.set(event.pageSize);
    this.pageIndex.set(event.pageIndex);
  }
}

import { NgFor, NgForOf, ViewportScroller } from "@angular/common";
import { Directive, OnInit, TemplateRef, inject, ChangeDetectorRef, InputSignal, input, WritableSignal, signal, effect, ViewContainerRef, OnDestroy, EmbeddedViewRef, ElementRef, InjectionToken, Signal, NgIterable } from "@angular/core";
import { ActivatedRoute } from "@angular/router";
import { Router } from "@angular/router";
import { filter, BehaviorSubject, Subscription, max } from "rxjs";
import { ListRange } from "@angular/cdk/collections";
import { DataSource } from "../../data";


export interface ScrollContext<T, R extends readonly T[] = readonly T[]> {
  $implicit: T;
  // index: number;
  // column: number;
  // row: number;
  // range: R | readonly T[];
}


@Directive({
  selector: '[scrollTemplate]',
  standalone: true
})
export class ScrollItem<T, U extends readonly T[] = readonly T[]> {
  template: TemplateRef<ScrollContext<T, U>> = inject(TemplateRef);
  checkVisible() {
    this.template.elementRef.nativeElement.checkVisibility()
  }
}

@Directive({
  selector: '[scrollable][scrollableOf]',
  standalone: true
})
export class Scrollable<T, U extends readonly T[] = readonly T[]> implements OnInit, OnDestroy {
  views: [{ row: number, column: number }, EmbeddedViewRef<ScrollContext<T, U>>][] = [];
  template: TemplateRef<ScrollContext<T>> = inject(TemplateRef);
  router: Router = inject(Router);
  route: ActivatedRoute = inject(ActivatedRoute);
  lastRange: WritableSignal<ListRange> = signal({ start: 0, end: 0 });
  source: InputSignal<DataSource<T>> = input.required({ alias: "scrollableOf" });
  range: BehaviorSubject<ListRange> = new BehaviorSubject<ListRange>(this.lastRange());
  currentList: WritableSignal<readonly T[]> = signal([]);
  vcf: ViewContainerRef = inject(ViewContainerRef);
  el: ElementRef<HTMLElement> = inject(ElementRef);
  isloading: boolean = false;
  countPerLoad: WritableSignal<number> = signal(40);
  countPerShift: WritableSignal<number> = signal(0);
  private offsetY: number = 0;
  private subscription: Subscription = new Subscription();
  private wheelHandler = this.onWheel.bind(this);
  private resizeHandler = this.onResize.bind(this);
  private keydownHandler = this.onKeyDown.bind(this);
  private focusedIndex: number = 0;
  constructor() {
    effect(() => {
      const range = this.lastRange();
      if(range)
      this.range.next(range);
    });
    effect(this.checkDiffAndSet.bind(this));

  }

  checkDiffAndSet() {
    let index = 0;
    let maxColumn = 0;
    let column = 0;
    let row = 0;
    for(let data of this.currentList()) {
      if(index < this.views.length) {
        const ctx = this.views[index][1].context;
        if(ctx.$implicit !== data) {
          ctx.$implicit = data;
          this.views[index][1].markForCheck()
        } 
      } else {
        const view = this.vcf.createEmbeddedView<ScrollContext<T, U>>(this.template, { $implicit: data });
        const root = view.rootNodes[0] as HTMLElement;
        root.tabIndex = -1;
        const { top, height } = root.getBoundingClientRect();
        const currentRow = Math.floor(top / height);
        if(currentRow === row) {
          column = 0;
          row = currentRow + 1;
        } else {
          column++;
        }
        this.views.push([{ row, column }, view]);
        
      }
      index++;
      maxColumn = Math.max(maxColumn, column);
    }
    while(this.views.length > index) {
      const view = this.views.pop()![1];
      view.destroy();
    }
    this.countPerShift.set(Math.max(this.countPerShift(), maxColumn + 1));
    this.isloading = false;
  }

  ngOnDestroy(): void {
    const wrapper = this.el.nativeElement.parentElement!;
    wrapper.removeEventListener('wheel', this.wheelHandler);
    window.removeEventListener('resize', this.resizeHandler);
    wrapper.removeEventListener('keydown', this.keydownHandler);
    for (let [, v] of this.views) {
      v.destroy();
    }
    this.subscription?.unsubscribe();
  }
  ngOnInit(): void {
    this.calculateGrid();
    window.addEventListener('resize', this.resizeHandler);
    const wrapper = this.el.nativeElement.parentElement!;
    wrapper.tabIndex = 0;
    wrapper.addEventListener('wheel', this.wheelHandler);
    wrapper.addEventListener('keydown', this.keydownHandler);
    this.subscription.add(
      this.source()
        .connect({ viewChange: this.range.pipe(filter(x => x !== undefined)) })
        .subscribe((data) => this.currentList.set(data))
    );
    this.lastRange.set({ start: 0, end: this.countPerLoad() });
  }
  onResize() {
    this.calculateGrid();
  }
  private calculateGrid(): void {
    const wrapper = this.el.nativeElement.parentElement!;
    const { height, width } = wrapper.getBoundingClientRect();
    const colLen = Math.max(1, Math.floor(width / 320));
    const rowLen = Math.max(1, Math.floor(height / 240)) + 1;
    this.countPerLoad.set(colLen * rowLen);
  }

  private onWheel(event: WheelEvent): void {
    const times = event.deltaY > 0 ? 1 : event.deltaY < 0 ? -1 : 0;
    if (times) {
      const load = this.countPerLoad();
      const total = this.source().length;
      const maxStart = Math.max(0, total - load);
      const shift = times * this.countPerShift();
      this.lastRange.update(old => {
        const newStart = Math.min(maxStart, Math.max(0, old.start + shift));
        return { start: newStart, end: newStart + load };
      });
    }
  }

  static ngTemplateContextGuard<T, U extends readonly T[] = readonly T[]>(
    ctx: any,
    dir: Scrollable<T, U>
  ): ctx is ScrollContext<T, U> {
    return true;
  }
  
  private onKeyDown(event: KeyboardEvent): void {
    const key = event.key;
    const load = this.countPerLoad();
    const total = this.source().length;
    const maxStart = Math.max(0, total - load);
    const shift = this.countPerShift();
    switch (key) {
      case 'ArrowDown':
        event.preventDefault();
        if (this.focusedIndex + shift < this.views.length) {
          this.moveFocus(this.focusedIndex + shift);
        } else if (this.lastRange().start < maxStart) {
          const newStart = Math.min(maxStart, this.lastRange().start + shift);
          this.lastRange.set({ start: newStart, end: newStart + load });
          this.moveFocus(this.views.length - 1);
        }
        break;
      case 'ArrowUp':
        event.preventDefault();
        if (this.focusedIndex - shift >= 0) {
          this.moveFocus(this.focusedIndex - shift);
        } else if (this.lastRange().start > 0) {
          const newStart = Math.max(0, this.lastRange().start - shift);
          this.lastRange.set({ start: newStart, end: newStart + load });
          this.moveFocus(0);
        }
        break;
      case 'ArrowRight':
        event.preventDefault();
        if (this.focusedIndex + 1 < this.views.length) {
          this.moveFocus(this.focusedIndex + 1);
        } else if (this.lastRange().start < maxStart) {
          const newStart = Math.min(maxStart, this.lastRange().start + shift);
          this.lastRange.set({ start: newStart, end: newStart + load });
          this.moveFocus(this.views.length - 1);
        }
        break;
      case 'ArrowLeft':
        event.preventDefault();
        if (this.focusedIndex - 1 >= 0) {
          this.moveFocus(this.focusedIndex - 1);
        } else if (this.lastRange().start > 0) {
          const newStart = Math.max(0, this.lastRange().start - shift);
          this.lastRange.set({ start: newStart, end: newStart + load });
          this.moveFocus(0);
        }
        break;
      case ' ':
      case 'Spacebar':
        event.preventDefault();
        if (this.focusedIndex >= 0 && this.focusedIndex < this.views.length) {
          const el = this.views[this.focusedIndex][1].rootNodes[0] as HTMLElement;
          el.click();
        }
        break;
    }
  }

  private moveFocus(index: number): void {
    const max = this.views.length - 1;
    const i = Math.max(0, Math.min(max, index));
    if (this.focusedIndex >= 0 && this.focusedIndex <= max) {
      (this.views[this.focusedIndex][1].rootNodes[0] as HTMLElement).classList.remove('focused');
    }
    this.focusedIndex = i;
    const el = this.views[i][1].rootNodes[0] as HTMLElement;
    el.classList.add('focused');
    el.focus({ preventScroll: true });
    el.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }
}
type Vector = { X: number, Y: number };
namespace Vector {
  export const Zero: Vector = { X: 0, Y: 0 };
}
export { Vector };


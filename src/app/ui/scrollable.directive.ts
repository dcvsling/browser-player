import { ViewportScroller } from "@angular/common";
import { Directive, OnInit, TemplateRef, inject, ChangeDetectorRef, InputSignal, input, WritableSignal, signal, effect, ViewContainerRef, OnDestroy, EmbeddedViewRef, ElementRef, Provider, forwardRef, InjectionToken, Signal, viewChild, contentChild, computed } from "@angular/core";
import { ActivatedRoute } from "@angular/router";
import { Router } from "@angular/router";
import { filter, BehaviorSubject, Subscription } from "rxjs";
import { DataSource, ListRange } from "@angular/cdk/collections";


export interface ScrollContext<T, R extends readonly T[] = readonly T[]> {
  $implicit: T;
  // index: number;
  // column: number;
  // row: number;
  // range: R | readonly T[];
}


@Directive({
  selector: '[scrollItem]',
  standalone: true
})
export class ScrollItem<T, U extends readonly T[] = readonly T[]> {
  template: TemplateRef<ScrollContext<T, U>> = inject(TemplateRef);
  checkVisible() {
    this.template.elementRef.nativeElement.checkVisibility()
  }
}

@Directive({
  selector: '[scrollable]',
  standalone: true
})
export class Scrollable<T, U extends readonly T[] = readonly T[]> implements OnInit, OnDestroy {
  views: EmbeddedViewRef<ScrollContext<T, U>>[] = [];
  //template: ScrollItem<T, U> = iinject(SCROLL_ITEM_TOKEN, { self: true });
  template: Signal<ScrollItem<T, U>> = contentChild.required(ScrollItem);
  router: Router = inject(Router);
  route: ActivatedRoute = inject(ActivatedRoute);
  vps: ViewportScroller = inject(ViewportScroller);
  cdf: ChangeDetectorRef = inject(ChangeDetectorRef);
  lastRange: WritableSignal<ListRange> = signal({ start: 0, end: 0 });
  source: InputSignal<DataSource<T>> = input.required({ alias: "scrollable" });
  range: BehaviorSubject<ListRange> = new BehaviorSubject<ListRange>(this.lastRange());
  currentList: WritableSignal<readonly T[]> = signal([]);
  vcf: ViewContainerRef = inject(ViewContainerRef);
  el: ElementRef<HTMLElement> = inject(ElementRef);
  isloading: boolean = false;
  countPerLoad: number = 20;
  private offsetY: number = 0;
  private subscription: Subscription = new Subscription();
  constructor() {
    effect(() => {
      const range = this.lastRange();
      if(range)
      this.range.next(range);
    });
  }
  ngOnDestroy(): void {
    for(let v of this.views) {
      v.destroy();
    }
    // document.removeEventListener('wheel', this.onWheel.bind(this));
    this.subscription?.unsubscribe();
  }
  ngOnInit(): void {
    document.addEventListener('wheel', this.onWheel.bind(this));
    this.subscription.add(this.source().connect({ viewChange: this.range.pipe(filter(x => x !== undefined)) })
      .subscribe(data => {
        for(let val of data) {
          const view = this.vcf.createEmbeddedView<ScrollContext<T, U>>(this.template().template, { $implicit: val });
          this.el.nativeElement.appendChild(view.rootNodes[0]);
          this.views.push(view);
        }
        this.isloading = false;
      }));
    this.lastRange.update(old => ({ start: old.end, end: old.end + this.countPerLoad }));
  }

  private onWheel(event: WheelEvent): void {
    // event.preventDefault();
  const listEl = this.el.nativeElement;
  const wrapperEl = listEl.parentElement!;

  // 1. 準備 DOM 與它們的 bounding rect
  const wrapperRect = wrapperEl.getBoundingClientRect();
  const itemEls: HTMLElement[] = this.views
    .map(v => v.rootNodes.find(n => n.nodeType === Node.ELEMENT_NODE) as HTMLElement)
    .filter(el => !!el);
  if (!itemEls.length) return;

  const firstRect  = itemEls[0].getBoundingClientRect();
  const lastRect   = itemEls[itemEls.length - 1].getBoundingClientRect();

  // 2. 計算「頭尾間距」：正值代表第一筆還沒頂到頂端、負值代表最後一筆還沒頂到底部
  const topGap    = firstRect.top    - wrapperRect.top;
  const bottomGap = lastRect.bottom  - wrapperRect.bottom;

  // 3.

  // 3. 預計的位移（offsetY 為負值時表示往上捲動內容）
  let newOffset = this.offsetY - event.deltaY;

  // 4. clamp：如果會捲過頭，就把 newOffset 修正到剛好貼齊
  //    - 向上捲（deltaY < 0），如果 topGap - deltaY > 0，就 clamp 在 topGap
  if (event.deltaY < 0 && topGap - event.deltaY > 0) {
    newOffset = this.offsetY - topGap;
  }
  //    - 向下捲（deltaY > 0），如果 bottomGap - deltaY < 0，就 clamp 在 bottomGap
  if (event.deltaY > 0 && bottomGap - event.deltaY < 0) {
    newOffset = this.offsetY - bottomGap;
  }

  // 5. 更新 offsetY，並套用 transform
  this.offsetY = newOffset;
  listEl.style.transform = `translateY(${this.offsetY}px)`;

  // 6. 觸底判定：last item 完全頂到底部時，觸發載入更多
  if (bottomGap <= 0 && !this.isloading) {
      this.lastRange.update(old => ({
        start: old.end,
        end:   old.end + this.countPerLoad
      }));
    }
  }

  static ngTemplateContextGuard<T, U extends readonly T[] = readonly T[]>(
    ctx: any,
    dir: Scrollable<T, U>
  ): ctx is ScrollContext<T, U> {
    return true;
  }
}
type Vector = { X: number, Y: number };
namespace Vector {
  export const Zero: Vector = { X: 0, Y: 0 };
}
export { Vector };



export interface Scroll {
  position: Signal<Vector>;
  delta: Signal<Vector>;
}

@Directive({
  selector: '[scrollable]',
  standalone: true
})
export class VirtualScrollable implements OnInit, Scroll {
  el: ElementRef<HTMLElement> = inject(ElementRef<HTMLElement>);
  deltaY: WritableSignal<number> = signal(0);
  constructor() {
    effect(() => this.el.nativeElement.style.transform = `translateY(${this.deltaY()}px)`);
  }
  position: WritableSignal<Vector> = signal(Vector.Zero);
  delta: WritableSignal<Vector> = signal(Vector.Zero);
  size: InputSignal<Vector> = input.required();
  range: Signal<Vector> = computed(() => {
    const { X, Y } = this.size();
    const { width, height } = this.el.nativeElement.getBoundingClientRect();
    return { X: width / X, Y: height / Y };
  })
  ngOnInit(): void {
    this.el.nativeElement.addEventListener('wheel', this.onWheel.bind(this));
  }
  private onWheel(event: WheelEvent) {
    const delta = { X: event.deltaX, Y: event.deltaY };
    const position = { X: event.x, Y: event.y };
    const { height, width } = this.el.nativeElement.getBoundingClientRect();
    const { X: rx, Y: ry } = this.range();
    this.delta.update(({ X, Y }) => ({
      X: Math.min(0, Math.max(event.deltaX/rx, width)),
      Y: Math.min(0, Math.max(event.deltaY/ry, height))
    }));
    this.position.update(({ X, Y }) => ({
      X: Math.min(0, Math.max((X + event.deltaX)/rx, width)),
      Y: Math.min(0, Math.max((Y + event.deltaY)/ry, height))
    }));
    this.el.nativeElement.addEventListener('scrolling', )
  }
  onscrolling(): void {

  }
}

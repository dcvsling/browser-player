import { CommonModule, ViewportScroller } from "@angular/common";
import { ChangeDetectorRef, Component, Directive, effect, ElementRef, EmbeddedViewRef, EventEmitter, inject, Input, input, InputSignal, NgIterable, OnChanges, OnInit, output, OutputEmitterRef, signal, SimpleChanges, TemplateRef, ViewContainerRef, ViewRef, WritableSignal } from "@angular/core";
import { ActivatedRoute, Router, Scroll } from "@angular/router";
import { filter, lastValueFrom, map, mergeMap, Observable, tap } from "rxjs";
import { DataSource } from "../../data/datasource";


export interface Cell<T> {
  current: T | undefined;
  index: number,
  isActived: boolean;
}

@Directive({
  selector: '[grid][gridOf]',
  standalone: true,
})
export class GridDirective<T> implements OnInit {
  templateRef: TemplateRef<Cell<T>> = inject(TemplateRef);
  views: WritableSignal<EmbeddedViewRef<Cell<T>>[]> = signal([]);
  src: InputSignal<readonly T[]> = input.required({ alias: 'gridOf' });

  constructor() {
    effect(() => {
      const src = this.src();
      const views = this.views();
      const length = Math.min(src.length, views.length);
      for(let i = 0; i < length; ++i) {
        const view = i >= views.length ? this.createView(i - 1) : views[i];
        view.context.current = src[i];
      }

    });
  }
  ngOnInit(): void {
  }

  private createView(index: number) {
    const view = this.templateRef.createEmbeddedView(this.createContext(index));
    this.views.update(views => [...views, view]);
    return view;
  }

  private createContext(index: number): Cell<T> {
    return { current: undefined, index, isActived: false }
  }
  

}

export interface ListContext<T, U extends NgIterable<T> = NgIterable<T>> {
  $implicit: T;
  vForOf: U;
  index: number;
}

@Directive({
  selector: '[vFor][vForOf]',
  standalone: true,
})
export class VFor<T, U extends NgIterable<T> = NgIterable<T>> implements OnInit {
  template: TemplateRef<ListContext<T, U>> = inject(TemplateRef);
  src: InputSignal<U & NgIterable<T>> = input.required({ alias: 'vForOf' });
  contexts: WritableSignal<ListContext<T, U>[]> = signal([]);
  vcf: ViewContainerRef = inject(ViewContainerRef);
  constructor() {
    effect(() => {
      let src = this.src();
      this.contexts.update(ctxs => {
        let index = ctxs.length;
        for(let instance of src) {
          if(ctxs.length <= index) {
            ctxs.push({
              $implicit: instance,
              index: index,
              vForOf: src
            });
            continue;
          }
          if(ctxs[index].$implicit === instance)
            continue;
          ctxs[index].$implicit = instance;
          ctxs[index].index = index;
          ctxs[index].vForOf = src;
          index++;
        }
        while(ctxs.length > index) {
          ctxs[index].$implicit = undefined as T;
          ctxs[index].index = index;
          ctxs[index].vForOf = src;
          index++;
        }
        return ctxs;
      });
    });
    effect(() => {
      this.contexts().forEach((ctx, index) =>{
        if(index >= this.vcf.length) {
          const view = this.vcf.createEmbeddedView(this.template, ctx);
          this.vcf.insert(view, index);
          return;
        }
        const vctx = (this.vcf.get(index) as EmbeddedViewRef<ListContext<T, U>>).context;
        if(vctx !== ctx) {
          vctx.$implicit = ctx.$implicit;
          vctx.index = ctx.index;
          vctx.vForOf = ctx.vForOf;
          (this.vcf.get(index) as EmbeddedViewRef<ListContext<T, U>>).markForCheck();
          return;
        }
      });
    });
  }
  ngOnInit(): void {
  }


  static ngTemplateContextGuard<T, U extends NgIterable<T>>(
    dir: VFor<T, U>,
    ctx: any,
  ): ctx is ListContext<T, U> {
    return true;
  }
}

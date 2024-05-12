import { ViewActions } from './view.actions';
import { Directive, InputSignal, IterableDiffers, NgIterable, TemplateRef, TrackByFunction, computed, inject, input, ViewContainerRef, effect, output, OutputEmitterRef, untracked, WritableSignal, signal, OnChanges, SimpleChanges, IterableChangeRecord, IterableChanges, EmbeddedViewRef, OutputRef, ElementRef, AfterContentChecked, AfterContentInit } from "@angular/core";
import { ForOfContext } from "./forOf.context";
import { ChangeHandlerContext, ChangesHandler } from "./change.handler";

@Directive({
  selector: '[for][forOf]',
  standalone: true
})
export class ForOf<T, U extends NgIterable<T> = NgIterable<T>> implements OnChanges {
  forOfTemplate: InputSignal<TemplateRef<ForOfContext<T, U>>> = input(inject(TemplateRef));
  forOf: InputSignal<(U & NgIterable<T>) | undefined | null> = input.required();
  forOfTrackBy: InputSignal<TrackByFunction<T>> = input((_, __) => {});
  forOfChanges: OutputEmitterRef<ChangeHandlerContext<T, U>> = output<ChangeHandlerContext<T, U>>();

  private changeHandler = inject(ChangesHandler);
  private differs = inject(IterableDiffers);
  private vcf = inject(ViewContainerRef);
  constructor() {
    this.forOfChanges.subscribe(context=> this.changeHandler.handle(context));
  }
  ngOnChanges(changes: SimpleChanges): void {
    if(!('forOf' in changes)) return;
    const { currentValue, previousValue } = changes['forOf'];

    const diff = this.differs.find(previousValue ?? [])
      .create(this.forOfTrackBy())
      .diff(currentValue);
    if(diff)
      this.forOfChanges.emit({
        currentValue,
        previousValue,
        action: new ViewActions<T, U>(this.vcf, currentValue, this.forOfTemplate()),
        diff,
        data: currentValue
      });
  }

  static ngTemplateContextGuard<T, U extends NgIterable<T>>(
    dir: ForOf<T, U>,
    ctx: any,
  ): ctx is ForOfContext<T, U> {
    return true;
  }
}

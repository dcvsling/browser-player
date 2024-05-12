import { Directive, ElementRef, OutputEmitterRef, inject, output } from "@angular/core";

@Directive({
  selector: '[endOfScroll]',
  standalone: true
})
export class EndOfScrollDirective {
  el: ElementRef<HTMLElement> = inject(ElementRef);
  endOfScroll: OutputEmitterRef<void> = output<void>();
  constructor() {
    document.addEventListener('scrollend', () => {
      const lastItem = this.el.nativeElement.lastElementChild?.getClientRects()[0];
      const container = this.el.nativeElement.getClientRects()[0];
      if(!lastItem || (container.y + container.height < lastItem.bottom)) return;
      this.endOfScroll.emit();
    });
  }
}

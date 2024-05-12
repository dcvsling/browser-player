import { Directive, ElementRef, InputSignal, inject, input } from "@angular/core";

export interface KeyBindingMap {
  [code: string]: (el: ElementRef<HTMLElement>) => (void | Promise<void>);
}

@Directive({
  selector: '[keybinding]',
  standalone: true
})
export class KeyBindingDirective {
  keybinding: InputSignal<KeyBindingMap> = input({});
  el: ElementRef<HTMLElement> = inject(ElementRef);
  constructor() {
    document.addEventListener('keydown', ({ key }) => {
      const map = this.keybinding();
      if(key in map)
        map[key](this.el);
    });
  }
}

import { KeyName } from "./keyboard.types";

export interface KeyEventOptions {
  ctrl: boolean;
  shift: boolean;
  alt: boolean;
  meta: boolean;
}

export function KeyEvent(key: KeyName, options: Partial<KeyEventOptions> = { alt: false, ctrl: false, shift: false, meta: false }) {
  return function(target: object, name: string, desc: PropertyDescriptor) {
    const method = desc.value;
    if (typeof method !== 'function') {
      throw new Error(`@KeyEvent decorator can only be applied to methods. ${name} is not a method.`);
    }
    document.addEventListener('keydown', function(e: KeyboardEvent) {
      if (e.key === key && e.metaKey === options.meta && e.ctrlKey === options.ctrl && e.shiftKey === options.shift && e.altKey === options.alt) {
        method.call(target, e);
      }
    });
  };
}

import { ElementRef, EmbeddedViewRef, Injectable, IterableChangeRecord, IterableChanges, NgIterable, SimpleChange, TemplateRef, ViewContainerRef, inject } from "@angular/core";
import { ViewActions } from "./view.actions";
import { ForOfContext } from "./forOf.context";

export interface ChangeHandlerContext<T, U extends NgIterable<T> = NgIterable<T>> {
  currentValue: U,
  previousValue: U,
  diff: IterableChanges<T>;
  action: ViewActions<T, U>;
  data: U;
}

export interface IChangeHandler<T,  U extends NgIterable<T> = NgIterable<T> > {
  handle(context: ChangeHandlerContext<T, U>): void;
}
@Injectable({ providedIn: 'root' })
export class ChangesHandler<T,  U extends NgIterable<T> = NgIterable<T>> implements IChangeHandler<T, U> {
  handle(context: ChangeHandlerContext<T, U>) {
    context.diff.forEachOperation(handleOperation);
    context.action.setIndexByCurrentSequence();
    context.diff.forEachIdentityChange(handleIdentityChange);

    function handleIdentityChange(record: IterableChangeRecord<T>) {
      context.action.changeContext(record.currentIndex!, record.item);
    }

    function handleOperation(record: IterableChangeRecord<T>) {

      if (!record.previousIndex) {
        context.action.append(record.item, record.currentIndex!);
      } else if (!record.currentIndex) {
        context.action.remove(record.previousIndex!);
      } else {
        context.action.move(record.item, record.previousIndex!, record.currentIndex!);
      }
    }
  }


}

import { EmbeddedViewRef, NgIterable, TemplateRef, ViewContainerRef } from "@angular/core";
import { ForOfContext } from "./forOf.context";

export class ViewActions<T, U extends NgIterable<T> = NgIterable<T>> {

  constructor(private vcf: ViewContainerRef,  private items: U, private template: TemplateRef<ForOfContext<T, U>>) {}
  append(context: T, index: number = -1, count: number = -1): EmbeddedViewRef<ForOfContext<T>> | null {
    // if(this.isFull()) return null;

    return this.vcf.createEmbeddedView(
      this.template,
      new ForOfContext<T, U>(context, this.items, index, count),
      index);
  }
  remove(adjustedPreviousIndex: number): void {
    this.vcf.remove(adjustedPreviousIndex === null ? undefined : adjustedPreviousIndex);
  }

  move(context: T, adjustedPreviousIndex: number, currentIndex: number): void {
    const view = this.vcf.get(adjustedPreviousIndex)!;
    if(view instanceof EmbeddedViewRef) {
      this.vcf.move(view!, currentIndex);
      (view as EmbeddedViewRef<ForOfContext<T, U>>).context.$implicit = context;

    }
  }
  changeContext(index: number, context: T): void {
    (<EmbeddedViewRef<ForOfContext<T, U>>>this.vcf.get(index)).context.$implicit = context;
  }
  applyElement<H extends HTMLElement>(index: number, apply: (el: H) => void): void {
    apply(((<EmbeddedViewRef<ForOfContext<T, U>>>this.vcf.get(index)).rootNodes[0]));
  }
  setIndexByCurrentSequence(from: number = 0) {
    for (let i = 0, ilen = this.vcf.length; i < ilen; i++) {
      const viewRef = <EmbeddedViewRef<ForOfContext<T, U>>>this.vcf.get(i + from);
      const context = viewRef.context;
      context.index = i;
      context.count = ilen;
      context.forOf = this.items;
    }
  }


  // private isFull(): boolean {
  //   if(this.vcf.length === 0) return false;
  //   const lastView = <EmbeddedViewRef<ForOfContext<T, U>>>this.vcf.get(this.vcf.length-1);
  //   const rect = (<HTMLElement>lastView.rootNodes[0]).getBoundingClientRect();
  //   const parentRect = (<HTMLElement>lastView.rootNodes[0]).parentElement!.parentElement!.getBoundingClientRect();
  //   return parentRect.height < rect.top
  // }
}

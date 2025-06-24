import { ChangeDetectorRef, Directive, effect, ElementRef, inject, input, InputSignal, OnInit } from "@angular/core";
import { VideoSource } from "../../graph";
import { IMAGE_RESIZE_WORKER } from "../app.component";

@Directive({
  selector: 'img[src]',
  standalone: true
})
export class ImageDirective implements OnInit {
  source: InputSignal<VideoSource> = input.required({ alias: 'src' });
  alt: InputSignal<string> = input<string>('');
  worker: Worker = inject<Worker>(IMAGE_RESIZE_WORKER);
  el: ElementRef<HTMLImageElement> = inject(ElementRef);
  cdf: ChangeDetectorRef = inject(ChangeDetectorRef);
  constructor() {
    effect(() => this.worker.postMessage({ source: this.source() }));
    effect(() => this.el.nativeElement.alt = this.alt());
  }
  ngOnInit(): void {
    this.worker.addEventListener('message', ({ data:{ id, content } }) => {
      if(id !== this.source().id) return;
      this.el.nativeElement.src = content;
      this.cdf.markForCheck();
    });
  }
}

import { Component, Directive, ElementRef, inject, input, InputSignal, OnInit, Renderer2 } from "@angular/core";
import { VideoSource } from "../../graph";
import { IMAGE_RESIZE_WORKER } from "../app.component";

@Directive({
  selector: 'canvas[image]',
  standalone: true,
  
})
export class CanvasImageDirective implements OnInit {
  source: InputSignal<VideoSource> = input.required({ alias: 'image' });
  worker: Worker = inject<Worker>(IMAGE_RESIZE_WORKER);
  el: ElementRef<HTMLCanvasElement> = inject(ElementRef);
  ngOnInit(): void {
    const offscreen = this.el.nativeElement.transferControlToOffscreen();
    this.worker.postMessage({ source: this.source(), canvas: offscreen }, [offscreen]);
  }
}

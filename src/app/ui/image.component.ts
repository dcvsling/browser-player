import { Component, computed, contentChild, effect, inject, input, InputSignal, signal, Signal, WritableSignal } from "@angular/core";
import { DriveClient } from "../../graph";

@Component({
  selector: 'img-c',
  template: `<img 
    #img 
    [alt]="alt()"
    [src]="dataUrl()" 
    [crossOrigin]=""/>`,
  standalone: true

})
export class ImageComponent {
  src: InputSignal<string> = input.required({ alias: 'src' });
  alt: InputSignal<string> = input('alt');
  client: DriveClient = inject(DriveClient);
  dataUrl: WritableSignal<string> = signal('');
  constructor() {
    effect(() => {
      this.client.loadImage(this.src())
        .subscribe(res => this.dataUrl.set(URL.createObjectURL(new Blob([new Uint8Array(res, 0, res.byteLength)]))));  
    }, { allowSignalWrites: true })
  }
  ngOnDestroy() {
    URL.revokeObjectURL(this.dataUrl());
  }
}
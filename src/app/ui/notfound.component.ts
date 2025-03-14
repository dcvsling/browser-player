import { Component } from "@angular/core";
import { AuthDirective } from "../../auth";

@Component({
  selector: 'not-found',
  hostDirectives: [AuthDirective],
  standalone: true,
  template:`notfound`
})
export class NotFound {

}

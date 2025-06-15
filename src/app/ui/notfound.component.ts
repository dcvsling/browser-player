import { Component, inject, OnInit } from "@angular/core";
import { IAccessTokenProvider } from "../../auth/accessor";
import { Router } from "@angular/router";

@Component({
  selector: 'not-found',
  standalone: true,
  template:`notfound`
})
export class NotFound implements OnInit {
  auth: IAccessTokenProvider = inject(IAccessTokenProvider)
  router: Router = inject(Router);
  ngOnInit(): void {
    
  }
}

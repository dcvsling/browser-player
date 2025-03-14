
import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatGridListModule } from '@angular/material/grid-list';
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterModule, MatToolbarModule, MatButtonModule, MatIconModule, MatGridListModule],
  template: `
    <mat-toolbar class="topbar">
      <button mat-icon-button routerLink="/player"><mat-icon>play_arrow</mat-icon></button>
      <button mat-icon-button routerLink="/"><mat-icon>folder</mat-icon></button>
      <!-- <button mat-icon-button routerLink="/settings"><mat-icon>setting</mat-icon></button> -->
      <!-- <span>{{ path() }}</span> -->
    </mat-toolbar>
    <div class="container">
      <router-outlet></router-outlet>
    </div>

  `,
  styles: [`
    :host {
      margin: 0;
      padding: 0;
      height: 100%;
      width: 100%;
      overflow-y: hidden
    }
    .topbar {
      height: 7%;
    }
    .container {
      height: 93%;
      width: 100%;
      overflow-y: hidden;
    }
  `]
})
export class AppComponent {
}

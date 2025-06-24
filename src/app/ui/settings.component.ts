import { Component } from "@angular/core";

@Component({
  selector: 'player-settings',
  standalone: true,
  template: `
    <h2>Keyboard Shortcuts</h2>
    <section>
      <h3>Playlist Controls</h3>
      <ul>
        <li><strong>Arrow Left</strong>: Rewind 5 seconds</li>
        <li><strong>Arrow Right</strong>: Fast forward 5 seconds</li>
        <li><strong>Arrow Up</strong>: Previous video (wrap around)</li>
        <li><strong>Arrow Down</strong>: Next video (wrap around)</li>
        <li><strong>Space</strong>: Play/Pause</li>
        <li><strong>Shuffle icon</strong>: Randomize playlist order</li>
      </ul>
    </section>
    <section>
      <h3>List Controls</h3>
      <ul>
        <li><strong>Arrow Keys</strong>: Navigate videos</li>
        <li><strong>Space</strong>: Add/Remove video from playlist</li>
      </ul>
    </section>
  `
})
export class SettingsComponent {

}

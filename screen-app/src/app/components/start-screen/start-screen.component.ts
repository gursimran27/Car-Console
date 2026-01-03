import { Component, EventEmitter, Input, Output, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-start-screen',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './start-screen.component.html',
  styleUrl: './start-screen.component.css'
})
export class StartScreenComponent implements OnChanges {
  @Input() roomCode: string | null = null;
  @Input() playersConnected: number = 0;
  @Input() qrCodeUrl: string | null = null;
  @Input() maxPlayers: number = 2;

  @Output() createRoom = new EventEmitter<void>();

  onCreateRoom() {
    this.createRoom.emit();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['playersConnected']) {
      console.log(`[LOBBY-UI] playersConnected changed: ${changes['playersConnected'].currentValue}`);
    }
  }
}

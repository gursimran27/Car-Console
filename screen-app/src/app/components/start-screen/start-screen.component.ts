import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-start-screen',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './start-screen.component.html',
  styleUrl: './start-screen.component.css'
})
export class StartScreenComponent {
  @Input() roomCode: string | null = null;
  @Input() controllerConnected: boolean = false;
  @Input() qrCodeUrl: string | null = null;
  
  @Output() createRoom = new EventEmitter<void>();
  
  onCreateRoom() {
    this.createRoom.emit();
  }
}

import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Obstacle } from '../../interfaces/game.interfaces';

@Component({
  selector: 'app-game-view',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './game-view.component.html',
  styleUrl: './game-view.component.css'
})
export class GameViewComponent {
  @Input() carPosition: number = 50;
  @Input() carSpeed: number = 0; // Lateral tilt for visuals
  @Input() roadOffset: number = 0;
  @Input() roadSpeed: number = 0;
  @Input() obstacles: Obstacle[] = [];
  @Input() gameRunning: boolean = false;
  @Input() gameOver: boolean = false;
  @Input() elapsedTime: string = '0.00';
  @Input() currentSpeed: number = 0;

  getCarRotation() {
    // Tilt car based on turning speed
    return this.carSpeed * 30; // Scale for visual effect
  }
}

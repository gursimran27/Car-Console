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
  @Input() players: any[] = [];
  @Input() roadOffset: number = 0;
  @Input() roadSpeed: number = 0; // Global road animation speed
  @Input() obstacles: Obstacle[] = [];
  @Input() gameRunning: boolean = false;
  @Input() gameOver: boolean = false;
  @Input() remainingTime: string = '3:00';
  @Input() winner: number | 'DRAW' | null = null;

  getCarRotation(p: any) {
    if (this.gameOver || p.crashed) return 0;
    return p.carSpeed * 30;
  }
}

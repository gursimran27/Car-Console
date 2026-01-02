import { Component, ElementRef, HostListener, OnInit, ViewChild, AfterViewInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GameService, CarInput } from './services/game.service';
import * as QRCode from 'qrcode';

interface Obstacle {
  id: number;
  x: number; // % horizontal
  y: number; // % vertical (0 top, 100 bottom)
  width: number; // %
  height: number; // % (visual height ref)
  type: string;
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit, AfterViewInit {
  roomCode: string | null = null;
  controllerConnected = false;
  qrCodeUrl: string | null = null;
  
  // Game State
  gameRunning = false;
  gameOver = false;
  
  carPosition = 50; // Percentage 0-100 (50 is center)
  carSpeed = 0; // Horizontal speed
  currentInput: 'LEFT' | 'RIGHT' | 'CENTER' = 'CENTER';
  
  roadSpeed = 0;
  roadOffset = 0;
  
  // Obstacles
  obstacles: Obstacle[] = [];
  obstacleTimer = 0;
  obstacleSpawnRate = 50; // More frequent spawns

  // Constants
  private readonly MAX_SPEED = 1.0; 
  private readonly ACCEL = 0.1;
  private readonly FRICTION = 0.05;
  private readonly LANE_Bounds = { min: 10, max: 90 }; 
  private readonly CAR_WIDTH = 15; // Match CSS 15%
  private readonly CAR_HEIGHT = 15; // Match CSS 15%

  // Timer
  startTime = 0;
  elapsedTime = '0.00';

  constructor(private gameService: GameService, private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    this.gameService.roomCode$.subscribe(code => {
      this.roomCode = code;
      if (code && !this.qrCodeUrl) {
        this.generateQR(code);
      }
    });
    
    this.gameService.controllerConnected$.subscribe(connected => {
      this.controllerConnected = connected;
      if (connected && !this.gameRunning && !this.gameOver) {
        this.startGame();
      }
    });

    this.gameService.input$.subscribe(input => {
      this.currentInput = input.steer;
    });

    this.gameService.gameRestart$.subscribe(() => {
        this.resetGame();
    });
  }

  ngAfterViewInit() {
    this.gameLoop();
  }

  startGame() {
    this.gameRunning = true;
    this.gameOver = false;
    this.roadSpeed = 1.5; // vertical speed % per frame
    this.obstacles = [];
    this.carPosition = 50;
    this.carSpeed = 0;
    
    // Timer Init
    this.startTime = Date.now();
    this.elapsedTime = '0.00';
  }

  resetGame() {
      this.startGame();
  }

  gameLoop = () => {
    if (this.gameRunning) {
      this.updatePhysics();
      
      // Update Timer
      const now = Date.now();
      const seconds = (now - this.startTime) / 1000;
      this.elapsedTime = seconds.toFixed(2);
    }
    this.updateVisuals(); 
    this.cdr.detectChanges(); // Force UI update
    requestAnimationFrame(this.gameLoop);
  }

  updatePhysics() {
    // 1. Handle Input -> Speed
    if (this.currentInput === 'LEFT') {
      this.carSpeed -= this.ACCEL;
    } else if (this.currentInput === 'RIGHT') {
      this.carSpeed += this.ACCEL;
    } else {
      // Friction
      if (this.carSpeed > 0) {
        this.carSpeed -= this.FRICTION;
        if (this.carSpeed < 0) this.carSpeed = 0;
      } else if (this.carSpeed < 0) {
        this.carSpeed += this.FRICTION;
        if (this.carSpeed > 0) this.carSpeed = 0;
      }
    }

    // Clamp Max Speed (Lateral)
    if (this.carSpeed > this.MAX_SPEED) this.carSpeed = this.MAX_SPEED;
    if (this.carSpeed < -this.MAX_SPEED) this.carSpeed = -this.MAX_SPEED;

    // 2. Update Position
    this.carPosition += this.carSpeed;

    // 3. Wall Collision
    if (this.carPosition < this.LANE_Bounds.min) {
      this.carPosition = this.LANE_Bounds.min;
      this.carSpeed = 0;
      this.handleCrash();
    }
    if (this.carPosition > this.LANE_Bounds.max) {
      this.carPosition = this.LANE_Bounds.max;
      this.carSpeed = 0;
      this.handleCrash();
    }

    // 4. Obstacles
    this.updateObstacles();
  }

  updateObstacles() {
      // Spawn
      this.obstacleTimer++;
      if (this.obstacleTimer > this.obstacleSpawnRate) {
          this.spawnObstacle();
          this.obstacleTimer = 0;
          // Increase difficulty?
          if (this.obstacleSpawnRate > 30) this.obstacleSpawnRate -= 2;
      }

      // Move & Filter
      const carRect = { 
          x: this.carPosition - (this.CAR_WIDTH/2), 
          y: 90, // Car is fixed visually at bottom 10% (logic y = 100 - 10 = 90)
          w: this.CAR_WIDTH, 
          h: this.CAR_HEIGHT 
      };

      for (let i = this.obstacles.length - 1; i >= 0; i--) {
          let obs = this.obstacles[i];
          obs.y += this.roadSpeed;

          // Check Collision
          // Simple AABB
          // Car Y is approx 75% to 90% in view coordinates? 
          // Let's align with CSS. .car bottom: 100px.
          
          // Let's convert to simple percentage logic collision for prototype
          // Car is at ~ height-100px. In %, let's say car is at Y=80% to 90%.
          const obsRect = { x: obs.x, y: obs.y, w: obs.width, h: obs.height };
          
          if (this.checkCollision(carRect, obsRect)) {
              this.handleCrash();
          }

          // Remove if off screen
          if (obs.y > 100) {
              this.obstacles.splice(i, 1);
          }
      }
  }

  spawnObstacle() {
      const laneWidth = 20;
      // Random x between min and max bounds
      const x = Math.random() * (this.LANE_Bounds.max - this.LANE_Bounds.min - laneWidth) + this.LANE_Bounds.min;
      
      this.obstacles.push({
          id: Date.now(),
          x: x,
          y: -10, // Start above screen
          width: 10,
          height: 10,
          type: 'rock'
      });
  }

  checkCollision(car: any, obs: any): boolean {
      // car: {x,y,w,h}, obs: {x,y,w,h} in percentages
      return (
          car.x < obs.x + obs.w &&
          car.x + car.w > obs.x &&
          car.y < obs.y + obs.h &&
          car.y + car.h > obs.y
      );
  }

  handleCrash() {
      this.gameRunning = false;
      this.gameOver = true;
      this.gameService.notifyGameOver();
  }

  updateVisuals() {
    if (this.gameRunning) {
       this.roadOffset += this.roadSpeed * 10; // px approximation
       if (this.roadOffset > 100) this.roadOffset = 0;
    }
  }

  async generateQR(code: string) {
    const host = window.location.hostname;
    // Assume controller is on port 4201
    const url = `http://${host}:4201?room=${code}`;
    try {
      this.qrCodeUrl = await QRCode.toDataURL(url, { margin: 1, scale: 6 });
    } catch (err) {
      console.error(err);
    }
  }
}

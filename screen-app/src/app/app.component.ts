import { Component, OnInit, AfterViewInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GameService } from './services/game.service';
import { StartScreenComponent } from './components/start-screen/start-screen.component';
import { GameViewComponent } from './components/game-view/game-view.component';
import { Obstacle } from './interfaces/game.interfaces';
import * as QRCode from 'qrcode';
import { environment } from '../environments/environment';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, StartScreenComponent, GameViewComponent],
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

  // Speed Control
  currentSpeed = 0;
  isGasPressed = false;
  isBrakePressed = false;

  // Physics Constants
  private readonly MAX_SPEED = 2.5; // Max speed multiplier
  private readonly ACCELERATION_RATE = 0.05;
  private readonly BRAKING_RATE = 0.1;
  private readonly FRICTION_RATE = 0.02;

  // Constants 
  private readonly ACCEL = 0.04; // Gentle acceleration
  private readonly FRICTION = 0.15; // High friction (stops quick)
  private readonly MAX_LATERAL_SPEED = 0.8; // Low max speed (no flying)
  private readonly LANE_Bounds = { min: 10, max: 90 };
  private readonly CAR_WIDTH = 15; // Match CSS 15%
  private readonly CAR_HEIGHT = 15; // Match CSS 15%

  // Timer
  startTime = 0;
  elapsedTime = '0.00';

  constructor(private gameService: GameService, private cdr: ChangeDetectorRef) { }

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

    this.gameService.pedal$.subscribe(pedal => {
      if (pedal.type === 'GAS') {
        this.isGasPressed = pedal.isDown;
      } else if (pedal.type === 'BRAKE') {
        this.isBrakePressed = pedal.isDown;
      }
    });

    this.gameService.gameRestart$.subscribe(() => {
      this.startGame();
    });
  }

  ngAfterViewInit() {
    this.gameLoop();
  }

  createRoom() {
    this.gameService.createRoom();
  }

  startGame() {
    this.gameRunning = true;
    this.gameOver = false;
    this.currentSpeed = 0;
    this.roadSpeed = 0;
    this.obstacles = [];
    this.carPosition = 50;
    this.carSpeed = 0;

    // Timer Init
    this.startTime = Date.now();
    this.elapsedTime = '0.00';

    // Attempt Fullscreen
    this.attemptFullscreen();
  }

  attemptFullscreen() {
    try {
      const elem = document.documentElement;
      if (elem.requestFullscreen) {
        elem.requestFullscreen().catch(e => console.warn('Fullscreen blocked:', e));
      } else if ((elem as any).webkitRequestFullscreen) {
        (elem as any).webkitRequestFullscreen();
      }
    } catch (err) {
      console.log('Fullscreen error:', err);
    }
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
    // 0. Speed Physics
    if (this.isGasPressed) {
      this.currentSpeed += this.ACCELERATION_RATE;
    } else if (this.isBrakePressed) {
      this.currentSpeed -= this.BRAKING_RATE;
    } else {
      // Coasting friction
      this.currentSpeed -= this.FRICTION_RATE;
    }

    // Clamp Speed
    if (this.currentSpeed > this.MAX_SPEED) this.currentSpeed = this.MAX_SPEED;
    if (this.currentSpeed < 0) this.currentSpeed = 0;

    // Apply speed to road (visuals) and obstacles
    this.roadSpeed = 1.5 * this.currentSpeed;

    // 1. Handle Input -> Speed (Lateral)
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
    if (this.carSpeed > this.MAX_LATERAL_SPEED) this.carSpeed = this.MAX_LATERAL_SPEED;
    if (this.carSpeed < -this.MAX_LATERAL_SPEED) this.carSpeed = -this.MAX_LATERAL_SPEED;

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
    // Spawn only if moving
    if (this.currentSpeed > 0.1) {
      this.obstacleTimer++;
      if (this.obstacleTimer > this.obstacleSpawnRate) {
        this.spawnObstacle();
        this.obstacleTimer = 0;
        if (this.obstacleSpawnRate > 30) this.obstacleSpawnRate -= 2;
      }
    }

    // Move & Filter
    const carRect = {
      x: this.carPosition - (this.CAR_WIDTH / 2),
      y: 90,
      w: this.CAR_WIDTH,
      h: this.CAR_HEIGHT
    };

    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      let obs = this.obstacles[i];
      obs.y += this.roadSpeed;

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
      if (this.roadOffset > 120) this.roadOffset = 0;
    }
  }

  async generateQR(code: string) {
    // Determine controller URL based on valid production check or local fallback
    // For now we keep the same logic or use environment if we want to synchronize URLs
    // But typically screen app generates QR for 'controller' URL.
    // Ideally this should also be in environment.ts but we'll stick to logic.
    const url = `${environment.controllerUrl}?room=${code}`;
    try {
      this.qrCodeUrl = await QRCode.toDataURL(url, { margin: 1, scale: 6 });
    } catch (err) {
      console.error(err);
    }
  }
}

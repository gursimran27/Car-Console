import { LandingPageComponent } from './components/landing-page/landing-page.component';
import { FullscreenModalComponent } from './components/fullscreen-modal/fullscreen-modal.component';
import { GameViewComponent } from './components/game-view/game-view.component';
import { StartScreenComponent } from './components/start-screen/start-screen.component';
import * as QRCode from 'qrcode';
import { AfterViewInit, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { GameService } from './services/game.service';
import { environment } from '../environments/environment';
import { CommonModule } from '@angular/common';
import { Obstacle } from './interfaces/game.interfaces';

interface Player {
  index: number;
  carPosition: number; // X position (5-95)
  worldY: number;      // Absolute distance from start
  displayY: number;    // Screen Y (calculated relative to camera)
  carSpeed: number;    // Horizontal steering speed
  currentInput: 'LEFT' | 'RIGHT' | 'CENTER';
  currentSpeed: number; // Gas/Brake speed (0 to MAX_SPEED)
  isGasPressed: boolean;
  isBrakePressed: boolean;
  score: number;
  crashed: boolean;
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, StartScreenComponent, GameViewComponent, LandingPageComponent, FullscreenModalComponent],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit, AfterViewInit {
  roomCode: string | null = null;
  playersConnected = 0;
  qrCodeUrl: string | null = null;

  // App Flow State
  currentStep: 'LANDING' | 'LOBBY' | 'GAME' = 'LANDING';
  showFullscreenModal = false;

  // Multi-player State
  players: Player[] = [];
  maxPlayers = environment.MAX_PLAYERS || 2;
  gameDurationMs = environment.GAME_DURATION_MS || 180000;

  // Game State
  gameRunning = false;
  gameOver = false;
  winner: number | 'DRAW' | null = null;

  roadSpeed = 0;
  roadOffset = 0;
  cameraY = 0; // Tracks the scrolling screen

  // Obstacles
  obstacles: Obstacle[] = [];
  obstacleTimer = 0;
  obstacleSpawnRate = 50;

  // Physics Constants
  private readonly MAX_SPEED = 2.5;
  private readonly ACCELERATION_RATE = 0.05;
  private readonly BRAKING_RATE = 0.1;
  private readonly FRICTION_RATE = 0.02;

  private readonly ACCEL = 0.04;
  private readonly FRICTION = 0.15;
  private readonly MAX_LATERAL_SPEED = 0.8;
  private readonly LANE_Bounds = { min: 5, max: 95 };
  private readonly CAR_WIDTH = 12; // Slightly smaller for 2 cars
  private readonly CAR_HEIGHT = 15;

  // Timer
  startTime = 0;
  remainingTime = '3:00';
  elapsedSeconds = 0;

  constructor(private gameService: GameService, private cdr: ChangeDetectorRef) {
    console.log(`[APP] CONSTRUCTOR. maxPlayers: ${this.maxPlayers}`);
    this.initPlayers();
  }

  initPlayers() {
    this.players = [];
    for (let i = 0; i < this.maxPlayers; i++) {
      this.players.push({
        index: i,
        carPosition: 30 + (i * 40), // P1 at 30%, P2 at 70%
        worldY: 20,                 // Start position
        displayY: 20,
        carSpeed: 0,
        currentInput: 'CENTER',
        currentSpeed: 0,
        isGasPressed: false,
        isBrakePressed: false,
        score: 0,
        crashed: false
      });
    }
  }

  ngOnInit() {
    this.gameService.roomCode$.subscribe(code => {
      this.roomCode = code;
      if (code && !this.qrCodeUrl) {
        this.generateQR(code);
      }
    });

    this.gameService.playersConnected$.subscribe(count => {
      console.log(`[APP] playersConnected$: ${count}. Max: ${this.maxPlayers}. Step: ${this.currentStep}`);
      this.playersConnected = count;

      if (this.currentStep === 'LOBBY' && count >= this.maxPlayers) {
        console.log(`[APP] LOBBY condition met. Opening Fullscreen Modal...`);
        this.showFullscreenModal = true;
      }
    });

    this.gameService.playerJoined$.subscribe(data => {
      console.log(`[APP] playerJoined$ Event:`, data);
    });

    this.gameService.input$.subscribe(input => {
      if (input.playerIndex !== undefined && this.players[input.playerIndex]) {
        this.players[input.playerIndex].currentInput = input.steer;
      }
    });

    this.gameService.pedal$.subscribe(pedal => {
      if (pedal.playerIndex !== undefined && this.players[pedal.playerIndex]) {
        const p = this.players[pedal.playerIndex];
        if (pedal.type === 'GAS') p.isGasPressed = pedal.isDown;
        else if (pedal.type === 'BRAKE') p.isBrakePressed = pedal.isDown;
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
    this.currentStep = 'LOBBY';
  }

  handleFullscreenDecision(mode: 'FULL' | 'WINDOW') {
    this.showFullscreenModal = false;
    if (mode === 'FULL') {
      this.attemptFullscreen();
    }
    this.startGame();
  }

  startGame() {
    console.log(`[APP] --- startGame() Called ---`);
    this.currentStep = 'GAME';
    this.gameRunning = true;
    this.gameOver = false;
    this.winner = null;
    this.initPlayers();
    console.log(`[APP] Players Initialized:`, this.players.length);
    this.obstacles = [];
    this.roadSpeed = 0;

    // Timer Init
    this.startTime = Date.now();
    this.elapsedSeconds = 0;
    console.log(`[APP] GAME STEP ACTIVE: ${this.currentStep}`);
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
      this.updateTimer();
    }
    this.updateVisuals();
    this.cdr.detectChanges();
    requestAnimationFrame(this.gameLoop);
  }

  updateTimer() {
    const now = Date.now();
    const elapsed = now - this.startTime;
    const remaining = Math.max(0, this.gameDurationMs - elapsed);

    const mins = Math.floor(remaining / 60000);
    const secs = Math.floor((remaining % 60000) / 1000);
    this.remainingTime = `${mins}:${secs.toString().padStart(2, '0')}`;
    this.elapsedSeconds = Math.floor(elapsed / 1000);

    if (remaining <= 0) {
      this.handleGameEnd();
    }
  }

  updatePhysics() {
    let maxWorldY = -Infinity;

    // 1. Position Update
    this.players.forEach(p => {
      if (p.crashed) return;

      // Speed Physics
      if (p.isGasPressed) p.currentSpeed += this.ACCELERATION_RATE;
      else if (p.isBrakePressed) p.currentSpeed -= this.BRAKING_RATE;
      else p.currentSpeed -= this.FRICTION_RATE;

      if (p.currentSpeed > this.MAX_SPEED) p.currentSpeed = this.MAX_SPEED;
      if (p.currentSpeed < 0) p.currentSpeed = 0;

      // Absolute movement
      p.worldY += p.currentSpeed;
      maxWorldY = Math.max(maxWorldY, p.worldY);

      // Steering
      if (p.currentInput === 'LEFT') p.carSpeed -= this.ACCEL;
      else if (p.currentInput === 'RIGHT') p.carSpeed += this.ACCEL;
      else {
        if (p.carSpeed > 0) p.carSpeed = Math.max(0, p.carSpeed - this.FRICTION);
        else if (p.carSpeed < 0) p.carSpeed = Math.min(0, p.carSpeed + this.FRICTION);
      }

      if (p.carSpeed > this.MAX_LATERAL_SPEED) p.carSpeed = this.MAX_LATERAL_SPEED;
      if (p.carSpeed < -this.MAX_LATERAL_SPEED) p.carSpeed = -this.MAX_LATERAL_SPEED;

      p.carPosition += p.carSpeed;

      // Wall Collision
      if (p.carPosition < this.LANE_Bounds.min || p.carPosition > this.LANE_Bounds.max) {
        p.crashed = true;
        this.checkAllCrashed();
      }
    });

    // 2. Camera Update
    if (maxWorldY !== -Infinity) {
      const targetCameraY = maxWorldY - 70;
      this.cameraY += (targetCameraY - this.cameraY) * 0.1;
    }

    // 3. Screen Transform & DQ Logic
    this.players.forEach(p => {
      if (p.crashed) return;
      p.displayY = p.worldY - this.cameraY;

      if (p.displayY < -15) { // Fell too far behind!
        p.crashed = true;
        this.checkAllCrashed();
      }
    });

    // 4. Visuals (Road scrolling)
    this.roadOffset = (this.cameraY * 10) % 100;

    // 5. Collisions
    this.checkCarCarCollision();
    this.updateObstacles();
  }

  checkCarCarCollision() {
    if (this.players.length < 2) return;
    const p1 = this.players[0];
    const p2 = this.players[1];
    if (p1.crashed || p2.crashed) return;

    const dx = Math.abs(p1.carPosition - p2.carPosition);
    const dy = Math.abs(p1.displayY - p2.displayY);

    if (dx < this.CAR_WIDTH - 2 && dy < (this.CAR_HEIGHT / 2)) {
      p1.crashed = true;
      p2.crashed = true;
      this.handleGameEnd();
    }
  }

  checkAllCrashed() {
    if (this.players.every(p => p.crashed)) {
      this.handleGameEnd();
    }
  }

  handleGameEnd() {
    if (!this.gameRunning) return;
    this.gameRunning = false;
    this.gameOver = true;

    let maxPoints = -1;
    let winningIdx: number | 'DRAW' | null = null;
    let isDraw = false;

    this.players.forEach(p => {
      if (p.score > maxPoints) {
        maxPoints = p.score;
        winningIdx = p.index;
        isDraw = false;
      } else if (p.score === maxPoints && maxPoints > -1) {
        isDraw = true;
      }
    });

    this.winner = isDraw ? 'DRAW' : winningIdx;
    this.gameService.notifyGameOver({ winner: this.winner });
  }

  updateObstacles() {
    if (!this.gameRunning) return;

    this.obstacleTimer++;
    if (this.obstacleTimer > this.obstacleSpawnRate) {
      this.spawnObstacle();
      this.obstacleTimer = 0;
      if (this.obstacleSpawnRate > 30) this.obstacleSpawnRate -= 1;
    }

    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      let obs = this.obstacles[i];
      obs.y += 1.5; // Fixed speed relative to car speed

      let picked = false;
      for (const p of this.players) {
        if (p.crashed) continue;

        const carRect = {
          x: p.carPosition - (this.CAR_WIDTH / 2),
          y: 100 - p.displayY - this.CAR_HEIGHT,
          w: this.CAR_WIDTH,
          h: this.CAR_HEIGHT
        };
        const obsRect = { x: obs.x, y: obs.y, w: obs.width, h: obs.height };

        if (this.checkCollision(carRect, obsRect)) {
          p.score += 10;
          picked = true;
          break;
        }
      }

      if (picked || obs.y > 110) {
        this.obstacles.splice(i, 1);
      }
    }
  }

  spawnObstacle() {
    const x = Math.random() * (this.LANE_Bounds.max - this.LANE_Bounds.min - 10) + this.LANE_Bounds.min;
    this.obstacles.push({
      id: Date.now(), x, y: -10, width: 10, height: 10, type: 'star'
    });
  }

  checkCollision(car: any, obs: any): boolean {
    return (car.x < obs.x + obs.w && car.x + car.w > obs.x && car.y < obs.y + obs.h && car.y + car.h > obs.y);
  }

  updateVisuals() {
    // Background parallax can go here if needed
  }

  async generateQR(code: string) {
    const url = `${environment.controllerUrl}?room=${code}`;
    try {
      this.qrCodeUrl = await QRCode.toDataURL(url, { margin: 1, scale: 6 });
    } catch (err) {
      console.error(err);
    }
  }
}

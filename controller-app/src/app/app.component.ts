import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ControllerService } from './services/controller.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit, OnDestroy {
  roomCodeInput: string = '';
  joinedRoom: string | null = null;
  errorMsg: string | null = null;
  
  // Gyro state
  permissionGranted = false;
  isSteering = 'CENTER'; // for UI feedback
  
  // Game State
  isGameOver = false;

  private subs: Subscription[] = [];
  private lastSendTime = 0;

  constructor(private controllerService: ControllerService) {}

  ngOnInit() {
    // Check URL params for room code
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room');
    if (roomParam) {
        this.roomCodeInput = roomParam;
        this.joinRoom();
    }

    this.subs.push(
      this.controllerService.joinedRoom$.subscribe(room => {
        this.joinedRoom = room;
        if (!room) {
          this.permissionGranted = false; // Reset on leave/disconnect
          this.isGameOver = false;
        }
      }),
      this.controllerService.error$.subscribe(err => this.errorMsg = err),
      this.controllerService.gameOver$.subscribe(over => this.isGameOver = over)
    );
  }

  ngOnDestroy() {
    this.subs.forEach(s => s.unsubscribe());
  }

  joinRoom() {
    if (this.roomCodeInput.length === 6) {
      this.controllerService.joinRoom(this.roomCodeInput);
    }
  }

  async requestPermission() {
    if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
      try {
        const response = await (DeviceOrientationEvent as any).requestPermission();
        if (response === 'granted') {
          this.permissionGranted = true;
          this.startGyro();
        } else {
          this.errorMsg = 'Permission denied';
        }
      } catch (e) {
        console.error(e);
        this.errorMsg = 'Error requesting permission';
      }
    } else {
      // Android / Non-iOS 13+
      this.permissionGranted = true;
      this.startGyro();
    }
  }

  startGyro() {
    window.addEventListener('deviceorientation', this.handleOrientation.bind(this));
  }
  
  // Fallback for desktop/testing
  steerLeft() { this.sendSteer('LEFT'); }
  steerRight() { this.sendSteer('RIGHT'); }
  releaseSteer() { this.sendSteer('CENTER'); }
  
  restartGame() {
      this.controllerService.restartGame();
  }

  private handleOrientation(event: DeviceOrientationEvent) {
    if (this.isGameOver) return; // No input on game over

    // control throttle
    const now = Date.now();
    if (now - this.lastSendTime < 50) return; // Limit to ~20fps

    const gamma = event.gamma || 0; // Left/Right tilt in degrees
    
    // Deadzone +/- 15 degrees
    let steer: 'LEFT' | 'RIGHT' | 'CENTER' = 'CENTER';
    if (gamma < -15) steer = 'LEFT';
    else if (gamma > 15) steer = 'RIGHT';

    if (this.isSteering !== steer) {
        this.sendSteer(steer);
    }
  }

  private sendSteer(val: 'LEFT' | 'RIGHT' | 'CENTER') {
      this.isSteering = val;
      this.controllerService.sendInput(val);
      this.lastSendTime = Date.now();
  }
}

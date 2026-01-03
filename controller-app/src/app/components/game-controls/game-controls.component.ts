import { Component, Input, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControllerService } from '../../services/controller.service';

@Component({
  selector: 'app-game-controls',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './game-controls.component.html',
  styleUrl: './game-controls.component.css'
})
export class GameControlsComponent implements OnDestroy {
  @Input() roomCode: string = '';
  @Input() isGameOver: boolean = false;

  permissionGranted = false;
  isSteering: 'LEFT' | 'RIGHT' | 'CENTER' = 'CENTER';

  // Gyro
  private boundHandleOrientation: any;

  constructor(private controllerService: ControllerService) { }

  ngOnDestroy() {
    if (this.boundHandleOrientation) {
      window.removeEventListener('deviceorientation', this.boundHandleOrientation);
    }
  }

  async requestPermission() {
    if (typeof (DeviceMotionEvent as any).requestPermission === 'function') {
      try {
        const response = await (DeviceMotionEvent as any).requestPermission();
        if (response === 'granted') {
          this.permissionGranted = true;
          this.startGyro();
        } else {
          alert('Permission denied');
        }
      } catch (e) {
        console.error(e);
        // Fallback for non-iOS 13+ or non-secure contexts
        this.permissionGranted = true;
        this.startGyro();
      }
    } else {
      // Non-iOS 13+ devices
      this.permissionGranted = true;
      this.startGyro();
    }
  }

  startGyro() {
    this.boundHandleOrientation = this.handleOrientation.bind(this);
    window.addEventListener('deviceorientation', this.boundHandleOrientation);
  }

  handleOrientation(event: DeviceOrientationEvent) {
    const beta = event.beta;   // front-back tilt (-180 to 180)
    const gamma = event.gamma; // left-right tilt (-90 to 90)

    if (beta === null || gamma === null) return;

    // Detect screen orientation
    // 0 = Portrait, 90 = Landscape Left, -90/270 = Landscape Right
    const orientation = (screen.orientation && screen.orientation.angle) !== undefined
      ? screen.orientation.angle
      : (window.orientation as number) || 0;

    let tilt = 0;

    if (orientation === 90) {
      // Landscape Left: Steering wheel feel comes from beta (tilting top/bottom edges)
      tilt = beta;
    } else if (orientation === -90 || orientation === 270) {
      // Landscape Right: Inverse of beta
      tilt = -beta;
    } else {
      // Portrait: Use gamma
      tilt = gamma;
    }

    // Steering thresholds
    if (tilt < -15) {
      this.sendSteer('LEFT');
    } else if (tilt > 15) {
      this.sendSteer('RIGHT');
    } else {
      this.sendSteer('CENTER');
    }
  }

  // Button Fallbacks
  steerLeft() { this.sendSteer('LEFT'); }
  steerRight() { this.sendSteer('RIGHT'); }
  releaseSteer() { this.sendSteer('CENTER'); }

  // Pedals
  pressGas() { this.controllerService.sendPedal('GAS', true); }
  releaseGas() { this.controllerService.sendPedal('GAS', false); }

  pressBrake() { this.controllerService.sendPedal('BRAKE', true); }
  releaseBrake() { this.controllerService.sendPedal('BRAKE', false); }

  restartGame() {
    this.isSteering = 'CENTER';
    this.controllerService.sendInput('CENTER');
    this.releaseGas();
    this.releaseBrake();
    this.controllerService.restartGame();
  }

  private sendSteer(val: 'LEFT' | 'RIGHT' | 'CENTER') {
    if (this.isSteering !== val) {
      this.isSteering = val;
      this.controllerService.sendInput(val);
    }
  }
}

import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { ControllerService } from './services/controller.service';
import { JoinScreenComponent } from './components/join-screen/join-screen.component';
import { GameControlsComponent } from './components/game-controls/game-controls.component';
import { ReadyScreenComponent } from './components/ready-screen/ready-screen.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, JoinScreenComponent, GameControlsComponent, ReadyScreenComponent],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit, OnDestroy {
  joinedRoom: string | null = null;
  isReady = false;
  isGameOver = false;

  private subs: Subscription[] = [];

  constructor(private controllerService: ControllerService) { }

  ngOnInit() {
    this.subs.push(
      this.controllerService.joinedRoom$.subscribe(room => {
        this.joinedRoom = room;

        // Check if mobile
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

        // If desktop, bypass ReadyScreen and go straight to controls
        if (!isMobile) {
          this.isReady = true;
        }
      }),
      this.controllerService.gameOver$.subscribe(gameOver => {
        this.isGameOver = gameOver;
      })
    );
  }

  handleReady() {
    this.isReady = true;
    this.handleMobileDisplay();
  }

  handleMobileDisplay() {
    // Move this logic here to ensure it runs on user gesture (ReadyScreen tap)
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    if (isMobile) {
      try {
        const elem = document.documentElement;
        if (elem.requestFullscreen) {
          elem.requestFullscreen().catch(err => console.log('Fullscreen failed:', err));
        } else if ((elem as any).webkitRequestFullscreen) {
          (elem as any).webkitRequestFullscreen();
        }
        if (screen.orientation && (screen.orientation as any).lock) {
          (screen.orientation as any).lock('landscape').catch((err: any) => console.log('Orientation lock failed:', err));
        }
      } catch (e) { console.log(e); }
    }
  }

  ngOnDestroy() {
    this.subs.forEach(s => s.unsubscribe());
  }
}

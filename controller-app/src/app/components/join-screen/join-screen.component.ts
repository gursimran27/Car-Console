import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ControllerService } from '../../services/controller.service';

@Component({
  selector: 'app-join-screen',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './join-screen.component.html',
  styleUrl: './join-screen.component.css'
})
export class JoinScreenComponent {
  roomCodeInput = '';
  errorMsg: string | null = null;

  constructor(private controllerService: ControllerService) {
      this.controllerService.error$.subscribe(err => this.errorMsg = err);
  }

  joinRoom() {
    if (this.roomCodeInput.length === 6) {
      this.controllerService.joinRoom(this.roomCodeInput);
      this.handleMobileDisplay();
    }
  }

  handleMobileDisplay() {
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
          } catch(e) { console.log(e); }
      }
  }
}

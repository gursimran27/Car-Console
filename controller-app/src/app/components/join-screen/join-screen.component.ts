import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { ControllerService } from '../../services/controller.service';

@Component({
  selector: 'app-join-screen',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './join-screen.component.html',
  styleUrl: './join-screen.component.css'
})
export class JoinScreenComponent implements OnInit {
  roomCodeInput = '';
  errorMsg: string | null = null;

  constructor(
    private controllerService: ControllerService,
    private route: ActivatedRoute
  ) {
    this.controllerService.error$.subscribe(err => this.errorMsg = err);
  }

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      const room = params['room'];
      if (room) {
        this.roomCodeInput = room.toUpperCase();
        // Auto-join if code is complete
        if (this.roomCodeInput.length === 6) {
          this.joinRoom();
        }
      }
    });
  }

  joinRoom() {
    if (this.roomCodeInput.length === 6) {
      this.controllerService.joinRoom(this.roomCodeInput);
    }
  }
}

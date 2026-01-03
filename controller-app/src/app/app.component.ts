import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { ControllerService } from './services/controller.service';
import { JoinScreenComponent } from './components/join-screen/join-screen.component';
import { GameControlsComponent } from './components/game-controls/game-controls.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, JoinScreenComponent, GameControlsComponent],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit, OnDestroy {
  joinedRoom: string | null = null;
  isGameOver = false;

  private subs: Subscription[] = [];

  constructor(private controllerService: ControllerService) {}

  ngOnInit() {
    this.subs.push(
      this.controllerService.joinedRoom$.subscribe(room => {
        this.joinedRoom = room;
      }),
      this.controllerService.gameOver$.subscribe(gameOver => {
        this.isGameOver = gameOver;
      })
    );
  }

  ngOnDestroy() {
    this.subs.forEach(s => s.unsubscribe());
  }
}

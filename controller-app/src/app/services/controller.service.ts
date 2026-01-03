import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { BehaviorSubject, Subject } from 'rxjs';
import { environment } from '../../environments/environment';
import { CarInput, PedalInput } from '../interfaces/input.interface';

@Injectable({
  providedIn: 'root'
})
export class ControllerService {
  private socket: Socket;
  private backendUrl = environment.apiUrl; 

  // State
  private joinedRoomSubject = new BehaviorSubject<string | null>(null);
  public joinedRoom$ = this.joinedRoomSubject.asObservable();

  private errorSubject = new BehaviorSubject<string | null>(null);
  public error$ = this.errorSubject.asObservable();

  private gameOverSubject = new BehaviorSubject<boolean>(false);
  public gameOver$ = this.gameOverSubject.asObservable();

  constructor() {
    this.socket = io(this.backendUrl, {
      autoConnect: true
    });

    this.setupListeners();
  }

  private setupListeners() {
    this.socket.on('connect', () => {
      console.log('Connected to backend:');
    });

    this.socket.on('joined-room', (roomCode: string) => {
      // console.log('Joined room:', roomCode);
      this.joinedRoomSubject.next(roomCode);
      this.errorSubject.next(null);
      this.gameOverSubject.next(false);
    });

    this.socket.on('error', (msg: string) => {
      console.error('Socket error:', msg);
      this.errorSubject.next(msg);
    });

    this.socket.on('disconnect', () => {
      // console.log('Disconnected from backend');
      this.joinedRoomSubject.next(null);
    });

    this.socket.on('room-closed', () => {
        this.joinedRoomSubject.next(null);
        this.errorSubject.next('Room closed by host');
    });

    this.socket.on('game-over', () => {
        this.gameOverSubject.next(true);
    });
    
    // If screen restarts game
    this.socket.on('restart-game', () => {
        this.gameOverSubject.next(false);
    });
  }

  public joinRoom(roomCode: string) {
    if (!roomCode || roomCode.length !== 6) {
        this.errorSubject.next('Invalid room code');
        return;
    }
    this.socket.emit('join-room', roomCode.toUpperCase());
  }

  public sendInput(steer: 'LEFT' | 'RIGHT' | 'CENTER') {
    this.socket.emit('car-input', { steer });
  }

  public sendPedal(type: 'GAS' | 'BRAKE', isDown: boolean) {
    // console.log('Sending pedal:', type, isDown);
    this.socket.emit('pedal-input', { type, isDown });
  }

  public restartGame() {
      this.socket.emit('restart-game');
      this.gameOverSubject.next(false);
  }
}

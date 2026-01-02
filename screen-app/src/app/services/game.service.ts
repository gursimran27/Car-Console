import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { BehaviorSubject, Subject } from 'rxjs';

export interface CarInput {
  steer: 'LEFT' | 'RIGHT' | 'CENTER';
}

@Injectable({
  providedIn: 'root'
})
export class GameService {
  private socket: Socket;
  private backendUrl = 'https://car-console.onrender.com';

  // State
  private roomCodeSubject = new BehaviorSubject<string | null>(null);
  public roomCode$ = this.roomCodeSubject.asObservable();

  private controllerConnectedSubject = new BehaviorSubject<boolean>(false);
  public controllerConnected$ = this.controllerConnectedSubject.asObservable();

  private inputSubject = new BehaviorSubject<CarInput>({ steer: 'CENTER' });
  public input$ = this.inputSubject.asObservable();

  private gameRestartSubject = new Subject<void>();
  public gameRestart$ = this.gameRestartSubject.asObservable();

  constructor() {
    this.socket = io(this.backendUrl, {
      autoConnect: true
    });
    this.setupListeners();
  }

  private setupListeners() {
    this.socket.on('connect', () => {
      console.log('Screen connected to backend');
      this.createRoom();
    });

    this.socket.on('room-created', (code: string) => {
      console.log('Room created:', code);
      this.roomCodeSubject.next(code);
    });

    this.socket.on('controller-connected', () => {
      console.log('Controller connected!');
      this.controllerConnectedSubject.next(true);
    });

    this.socket.on('controller-disconnected', () => {
      console.log('Controller disconnected');
      this.controllerConnectedSubject.next(false);
    });

    this.socket.on('car-input', (data: CarInput) => {
      this.inputSubject.next(data);
    });

    this.socket.on('restart-game', () => {
      this.gameRestartSubject.next();
    });
  }

  public createRoom() {
    this.socket.emit('create-room');
  }

  public notifyGameOver() {
    this.socket.emit('game-over');
  }
}

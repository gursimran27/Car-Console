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

  private playerIndexSubject = new BehaviorSubject<number | null>(null);
  public playerIndex$ = this.playerIndexSubject.asObservable();

  private playersConnectedSubject = new BehaviorSubject<number>(0);
  public playersConnected$ = this.playersConnectedSubject.asObservable();

  private errorSubject = new BehaviorSubject<string | null>(null);
  public error$ = this.errorSubject.asObservable();

  private gameOverSubject = new BehaviorSubject<boolean>(false);
  public gameOver$ = this.gameOverSubject.asObservable();

  private connectedSubject = new BehaviorSubject<boolean>(false);
  public connected$ = this.connectedSubject.asObservable();

  constructor() {
    this.socket = io(this.backendUrl, {
      autoConnect: true,
      reconnection: true
    });

    this.setupListeners();
  }

  private setupListeners() {
    this.socket.onAny((eventName, ...args) => {
      console.log(`[SOCKET-ANY] Received [${eventName}]:`, args);
    });

    this.socket.on('connect', () => {
      console.log(`[CONTROLLER] Connected to backend! ID: ${this.socket.id}`);
      this.connectedSubject.next(true);
    });

    this.socket.on('connect_error', (error) => {
      console.error('[CONTROLLER] Connection Error:', error);
      this.connectedSubject.next(false);
    });

    this.socket.on('joined-room', (data: { roomCode: string, playerIndex: number, playersConnected: number }) => {
      this.joinedRoomSubject.next(data.roomCode);
      this.playerIndexSubject.next(data.playerIndex);
      this.playersConnectedSubject.next(data.playersConnected);
      this.errorSubject.next(null);
      this.gameOverSubject.next(false);
    });

    this.socket.on('lobby-update', (data: { playersConnected: number }) => {
      this.playersConnectedSubject.next(data.playersConnected);
    });

    this.socket.on('error', (msg: string) => {
      this.errorSubject.next(msg);
    });

    this.socket.on('disconnect', () => {
      console.log('[CONTROLLER] Disconnected');
      this.connectedSubject.next(false);
      this.joinedRoomSubject.next(null);
      this.playerIndexSubject.next(null);
    });

    this.socket.on('room-closed', () => {
      this.joinedRoomSubject.next(null);
      this.playerIndexSubject.next(null);
      this.errorSubject.next('Room closed by host');
    });

    this.socket.on('game-over', () => {
      this.gameOverSubject.next(true);
    });

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

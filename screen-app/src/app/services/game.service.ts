import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { BehaviorSubject, Subject } from 'rxjs';
import { environment } from '../../environments/environment';
import { CarInput, PedalInput } from '../interfaces/game.interfaces';

@Injectable({
  providedIn: 'root'
})
export class GameService {
  private socket: Socket;
  private backendUrl = environment.apiUrl;

  // State
  private roomCodeSubject = new BehaviorSubject<string | null>(null);
  public roomCode$ = this.roomCodeSubject.asObservable();

  private playersConnectedSubject = new BehaviorSubject<number>(0);
  public playersConnected$ = this.playersConnectedSubject.asObservable();

  private playerJoinedSubject = new Subject<{ playerIndex: number, totalPlayers: number }>();
  public playerJoined$ = this.playerJoinedSubject.asObservable();

  private playerDisconnectedSubject = new Subject<{ playerIndex: number }>();
  public playerDisconnected$ = this.playerDisconnectedSubject.asObservable();

  private inputSubject = new Subject<CarInput>();
  public input$ = this.inputSubject.asObservable();

  private pedalSubject = new Subject<PedalInput>();
  public pedal$ = this.pedalSubject.asObservable();

  private gameRestartSubject = new Subject<void>();
  public gameRestart$ = this.gameRestartSubject.asObservable();

  constructor() {
    this.socket = io(this.backendUrl, {
      autoConnect: true
    });
    this.setupListeners();
  }

  private setupListeners() {
    this.socket.onAny((eventName, ...args) => {
      console.log(`[SOCKET-ANY] Received [${eventName}]:`, args);
    });

    this.socket.on('connect', () => {
      console.log(`[SERVICE] Connected to backend! ID: ${this.socket.id}`);
    });

    this.socket.on('room-created', (code: string) => {
      console.log(`[SERVICE] Room Created: ${code}`);
      this.roomCodeSubject.next(code);
    });

    this.socket.on('player-joined', (data: { playerIndex: number, totalPlayers: number }) => {
      console.log(`[SERVICE] player-joined received: P${data.playerIndex}, total: ${data.totalPlayers}`);
      this.playersConnectedSubject.next(data.totalPlayers);
      this.playerJoinedSubject.next(data);
    });

    this.socket.on('player-disconnected', (data: { playerIndex: number }) => {
      console.log(`[SERVICE] player-disconnected: P${data.playerIndex}`);
      this.playerDisconnectedSubject.next(data);
    });

    this.socket.on('lobby-update', (data: { playersConnected: number }) => {
      console.log(`[SERVICE] lobby-update received: ${data.playersConnected} players connected`);
      this.playersConnectedSubject.next(data.playersConnected);
    });

    this.socket.on('car-input', (data: CarInput) => {
      this.inputSubject.next(data);
    });

    this.socket.on('pedal-input', (data: PedalInput) => {
      this.pedalSubject.next(data);
    });

    this.socket.on('restart-game', () => {
      this.gameRestartSubject.next();
    });
  }

  public createRoom() {
    this.socket.emit('create-room');
  }

  public notifyGameOver(data: { winner: number | 'DRAW' | null }) {
    this.socket.emit('game-over', data);
  }
}

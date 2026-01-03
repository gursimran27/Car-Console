import { log } from '../utils/logger';
import { config } from '../config';

export interface RoomData {
  screenId: string;
  controllers: { socketId: string, playerIndex: number }[];
}

class RoomManager {
  private rooms: Map<string, RoomData> = new Map();

  generateRoomCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code: string;
    do {
      code = '';
      for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
    } while (this.rooms.has(code));
    return code;
  }

  createRoom(screenId: string): string {
    const code = this.generateRoomCode();
    this.rooms.set(code, { screenId, controllers: [] });
    log('ROOM', `Created ${code} by Screen ${screenId}`);
    return code;
  }

  getRoom(code: string): RoomData | undefined {
    return this.rooms.get(code);
  }

  joinRoom(code: string, controllerId: string): number | null {
    const room = this.rooms.get(code);
    if (!room) return null;

    if (room.controllers.length >= config.MAX_PLAYERS) {
      return null;
    }

    // Find first available player index (0 or 1 etc)
    const usedIndices = room.controllers.map(c => c.playerIndex);
    log('ROOM', `Room ${code} used indices: ${usedIndices.join(', ')}`);
    let playerIndex = 0;
    while (usedIndices.includes(playerIndex)) {
      playerIndex++;
    }

    room.controllers.push({ socketId: controllerId, playerIndex });
    log('JOIN', `Room ${code} now has ${room.controllers.length} controllers (config.MAX: ${config.MAX_PLAYERS})`);
    log('JOIN', `Controller ${controllerId} joined Room ${code} as Player ${playerIndex + 1}`);
    return playerIndex;
  }

  removeRoom(code: string) {
    this.rooms.delete(code);
    log('ROOM', `Destroyed ${code}`);
  }

  handleDisconnect(socketId: string, type: 'screen' | 'controller', roomCode: string | null) {
    if (!roomCode) {
      log('CONN', `User disconnected: ${socketId}`);
      return;
    }

    if (type === 'screen') {
      this.removeRoom(roomCode);
    } else if (type === 'controller') {
      const room = this.getRoom(roomCode);
      if (room) {
        room.controllers = room.controllers.filter(c => c.socketId !== socketId);
        log('CONN', `Controller disconnected from Room ${roomCode}`);
      }
    }
  }

  hasRoom(code: string): boolean {
    return this.rooms.has(code);
  }
}

export const roomManager = new RoomManager();

import { log } from '../utils/logger';

export interface RoomData {
  screenId: string;
  controllerId: string | null;
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
    this.rooms.set(code, { screenId, controllerId: null });
    log('ROOM', `Created ${code} by Screen ${screenId}`);
    return code;
  }

  getRoom(code: string): RoomData | undefined {
    return this.rooms.get(code);
  }

  joinRoom(code: string, controllerId: string): boolean {
    const room = this.rooms.get(code);
    if (!room) return false;
    
    room.controllerId = controllerId;
    log('JOIN', `Controller ${controllerId} joined Room ${code}`);
    return true;
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
              room.controllerId = null;
              log('CONN', `Controller disconnected from Room ${roomCode}`);
          }
      }
  }

  hasRoom(code: string): boolean {
      return this.rooms.has(code);
  }
}

export const roomManager = new RoomManager();

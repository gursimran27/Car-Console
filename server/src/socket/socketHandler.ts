import { Server, Socket } from 'socket.io';
import { roomManager } from '../services/roomManager';
import { log } from '../utils/logger';

interface SocketData {
    type: 'screen' | 'controller';
    roomCode: string;
}

export function setupSocketHandlers(io: Server) {
    io.on('connection', (socket: Socket) => {
        log('CONN', `User connected: ${socket.id}`);

        // Initialize socket data
        socket.data = { type: null, roomCode: null };

        socket.on('create-room', () => {
            const roomCode = roomManager.createRoom(socket.id);
            socket.join(roomCode);
            socket.data.type = 'screen';
            socket.data.roomCode = roomCode;
            socket.emit('room-created', roomCode);
        });

        socket.on('join-room', (roomCode: string) => {
            if (!roomManager.hasRoom(roomCode)) {
                socket.emit('error', 'Room not found');
                log('ERR', `Join failed: Room ${roomCode} not found (Socket: ${socket.id})`);
                return;
            }

            roomManager.joinRoom(roomCode, socket.id);
            socket.join(roomCode);
            socket.data.type = 'controller';
            socket.data.roomCode = roomCode;

            const room = roomManager.getRoom(roomCode);
            if (room) {
                io.to(room.screenId).emit('controller-connected');
            }
            socket.emit('joined-room', roomCode);
        });

        socket.on('car-input', (inputData) => {
            const { roomCode } = socket.data;
            if (roomCode) {
                const room = roomManager.getRoom(roomCode);
                if (room && room.screenId) {
                    io.to(room.screenId).emit('car-input', inputData);
                    log('INPUT', `Steer: ${inputData.steer} (Room: ${roomCode})`);
                }
            }
        });

        socket.on('pedal-input', (pedalData) => {
            const { roomCode } = socket.data;
            if (roomCode) {
                const room = roomManager.getRoom(roomCode);
                if (room && room.screenId) {
                    io.to(room.screenId).emit('pedal-input', pedalData);
                    log('PEDAL', `Type: ${pedalData.type}, Down: ${pedalData.isDown} (Room: ${roomCode})`);
                }
            }
        });

        socket.on('restart-game', () => {
            const { roomCode } = socket.data;
            if (roomCode) {
                const room = roomManager.getRoom(roomCode);
                if (room) {
                    io.to(room.screenId).emit('restart-game');
                    log('GAME', `Restart requested for Room ${roomCode}`);
                }
            }
        });

        socket.on('game-over', () => {
            const { roomCode } = socket.data;
            if (roomCode) {
                const room = roomManager.getRoom(roomCode);
                if (room && room.controllerId) {
                    io.to(room.controllerId).emit('game-over');
                }
                log('GAME', `Game Over in Room ${roomCode}`);
            }
        });

        socket.on('disconnect', () => {
            const { type, roomCode } = socket.data as SocketData;
            
            // Allow RoomManager to handle state cleanup
            roomManager.handleDisconnect(socket.id, type, roomCode);
            
            // If screen disconnected, notify controller to leave/reset
            if (type === 'screen' && roomCode) {
                io.to(roomCode).emit('room-closed');
            }
            // If controller disconnected, notify screen (handled in handleDisconnect logs usually, but we need to emit)
            if (type === 'controller' && roomCode) {
                const room = roomManager.getRoom(roomCode);
                if (room) {
                     io.to(room.screenId).emit('controller-disconnected');
                }
            }
        });
    });
}

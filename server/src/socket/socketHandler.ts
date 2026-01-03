import { Server, Socket } from 'socket.io';
import { roomManager } from '../services/roomManager';
import { log } from '../utils/logger';

interface SocketData {
    type: 'screen' | 'controller' | null;
    roomCode: string | null;
    playerIndex?: number;
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

        socket.on('join-room', (rawRoomCode: string) => {
            const roomCode = rawRoomCode.trim().toUpperCase();

            if (!roomManager.hasRoom(roomCode)) {
                socket.emit('error', 'Room not found');
                log('ERR', `Join failed: Room ${roomCode} not found (Socket: ${socket.id})`);
                return;
            }

            const playerIndex = roomManager.joinRoom(roomCode, socket.id);
            if (playerIndex === null) {
                socket.emit('error', 'Room is full');
                log('ERR', `Join failed: Room ${roomCode} is full (Socket: ${socket.id})`);
                return;
            }

            socket.join(roomCode);
            socket.data.type = 'controller';
            socket.data.roomCode = roomCode;
            socket.data.playerIndex = playerIndex;

            log('JOIN', `[V2] Controller ${socket.id} joined Room ${roomCode} as P${playerIndex + 1}`);

            const room = roomManager.getRoom(roomCode);
            const total = room!.controllers.length;
            const updateData = { playerIndex, totalPlayers: total, playersConnected: total, roomCode };

            // Verify room membership
            const members = io.sockets.adapter.rooms.get(roomCode);
            log('ROOM', `[V2] Room ${roomCode} members: ${members ? Array.from(members).join(', ') : 'EMPTY'}`);

            // 1. Confirm to the joining controller directly
            socket.emit('joined-room', updateData);

            // 2. Notify everyone in the room
            log('ROOM', `[V2] Broadcasting player-joined to Room ${roomCode} (Total: ${total})`);
            io.to(roomCode).emit('player-joined', updateData);
            io.to(roomCode).emit('lobby-update', updateData);

            // 3. Fallback: Explicitly target the screen-app socket
            if (room?.screenId) {
                log('ROOM', `[V2] Direct emit to Screen ${room.screenId}`);
                io.to(room.screenId).emit('player-joined', updateData);
            }
        });

        socket.on('car-input', (inputData) => {
            const { roomCode, playerIndex } = socket.data;
            if (roomCode) {
                const room = roomManager.getRoom(roomCode);
                if (room && room.screenId) {
                    io.to(room.screenId).emit('car-input', { ...inputData, playerIndex });
                    // Only log occasionally to avoid flood
                }
            }
        });

        socket.on('pedal-input', (pedalData) => {
            const { roomCode, playerIndex } = socket.data;
            if (roomCode) {
                const room = roomManager.getRoom(roomCode);
                if (room && room.screenId) {
                    io.to(room.screenId).emit('pedal-input', { ...pedalData, playerIndex });
                }
            }
        });

        socket.on('restart-game', () => {
            const { roomCode } = socket.data;
            if (roomCode) {
                const room = roomManager.getRoom(roomCode);
                if (room) {
                    io.to(roomCode).emit('restart-game');
                    log('GAME', `Restart requested for Room ${roomCode}`);
                }
            }
        });

        socket.on('game-over', (data) => {
            const { roomCode } = socket.data;
            if (roomCode) {
                io.to(roomCode).emit('game-over', data);
                log('GAME', `Game Over in Room ${roomCode}`);
            }
        });

        socket.on('disconnect', () => {
            const { type, roomCode, playerIndex } = socket.data as SocketData;

            // Allow RoomManager to handle state cleanup
            roomManager.handleDisconnect(socket.id, type as any, roomCode);

            // If screen disconnected, notify controllers to leave/reset
            if (type === 'screen' && roomCode) {
                io.to(roomCode).emit('room-closed');
            }
            // If controller disconnected, notify screen
            if (type === 'controller' && roomCode) {
                const room = roomManager.getRoom(roomCode);
                if (room) {
                    io.to(room.screenId).emit('player-disconnected', { playerIndex });
                    io.to(roomCode).emit('lobby-update', {
                        playersConnected: room.controllers.length
                    });
                }
            }
        });
    });
}

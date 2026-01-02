const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*', // Allow all origins for simplicity in this prototype
    methods: ['GET', 'POST']
  }
});

// Room State Management
// Map<RoomCode, RoomData>
// RoomData: { screenId: string, controllerId: string | null }
const rooms = new Map();

// Helper to generate 6-character room code
function generateRoomCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Screen creates a room
  socket.on('create-room', () => {
    let roomCode;
    do {
        roomCode = generateRoomCode();
    } while (rooms.has(roomCode));

    rooms.set(roomCode, { screenId: socket.id, controllerId: null });
    socket.join(roomCode);
    
    // Store type on socket for cleanup
    socket.data.type = 'screen';
    socket.data.roomCode = roomCode;

    socket.emit('room-created', roomCode);
    console.log(`Room created: ${roomCode} by Screen ${socket.id}`);
  });

  // Controller joins a room
  socket.on('join-room', (roomCode) => {
    const room = rooms.get(roomCode);
    if (!room) {
      socket.emit('error', 'Room not found');
      return;
    }

    if (room.controllerId) {
        // Optional: Allow reconnect or kick old? For now, simple reject or overwrite.
        // Let's overwrite/allow new controller for simplicity.
        // socket.emit('error', 'Room full');
        // return;
    }

    room.controllerId = socket.id;
    socket.join(roomCode);
    
    // Store type on socket
    socket.data.type = 'controller';
    socket.data.roomCode = roomCode;

    // Notify screen that controller joined
    io.to(room.screenId).emit('controller-connected');
    socket.emit('joined-room', roomCode);
    console.log(`Controller ${socket.id} joined Room ${roomCode}`);
  });

  // Controller sends input (LEFT, RIGHT, CENTER)
  socket.on('car-input', (inputData) => {
    // inputData: { steer: 'LEFT' | 'RIGHT' | 'CENTER' }
    const roomCode = socket.data.roomCode;
    if (roomCode && rooms.has(roomCode)) {
      const room = rooms.get(roomCode);
      if (room && room.screenId) {
        // Forward to the screen
        io.to(room.screenId).emit('car-input', inputData);
      }
    }
  });

  // Controller requests game restart
  socket.on('restart-game', () => {
    const roomCode = socket.data.roomCode;
    if (roomCode && rooms.has(roomCode)) {
      const room = rooms.get(roomCode);
      io.to(room.screenId).emit('restart-game');
    }
  });

  // Screen notifies game over (optional, but good for syncing state if needed)
  socket.on('game-over', () => {
    const roomCode = socket.data.roomCode;
    if (roomCode && rooms.has(roomCode)) {
      const room = rooms.get(roomCode);
      if (room.controllerId) {
        io.to(room.controllerId).emit('game-over');
      }
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    const roomCode = socket.data.roomCode;
    if (roomCode && rooms.has(roomCode)) {
      const room = rooms.get(roomCode);
      
      if (socket.data.type === 'screen') {
        // If screen disconnects, destroy room
        rooms.delete(roomCode);
        io.to(roomCode).emit('room-closed'); // Notify controller
        console.log(`Room ${roomCode} destroyed (Screen disconnected)`);
      } else if (socket.data.type === 'controller') {
        // If controller disconnects, just update state
        room.controllerId = null;
        io.to(room.screenId).emit('controller-disconnected');
        console.log(`Controller disconnected from Room ${roomCode}`);
      }
    }
  });
});

const PORT = process.env.PORT || 3333;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

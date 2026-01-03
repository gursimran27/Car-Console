import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { setupSocketHandlers } from './socket/socketHandler';
import { log } from './utils/logger';

dotenv.config();

const app = express();
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*'
}));

const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST']
  }
});

setupSocketHandlers(io);

const PORT = process.env.PORT || 3333;
server.listen(PORT, () => {
  log('SYS', `Server running on port ${PORT}`);
});

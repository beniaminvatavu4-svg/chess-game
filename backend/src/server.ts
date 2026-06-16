import { createServer } from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import app from './app';
import { registerChessHandlers } from './sockets/chess';

dotenv.config();

const PORT = parseInt(process.env.PORT || '3000', 10);
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:4200';

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: CLIENT_URL, methods: ['GET', 'POST'] },
});

io.on('connection', (socket) => {
  console.log(`Socket connected: ${socket.id}`);
  registerChessHandlers(io, socket);
});

httpServer.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

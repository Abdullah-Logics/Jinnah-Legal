import http from 'http';
import { Server } from 'socket.io';

const PORT = process.env.PORT || 3002;
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ status: 'ok', server: 'signaling' }));
});

const io = new Server(server, {
  cors: {
    origin: CORS_ORIGIN === '*' ? true : CORS_ORIGIN.split(',').map(s => s.trim()),
    credentials: true,
    methods: ['GET', 'POST'],
  },
  transports: ['websocket', 'polling'],
});

const onlineUsers = new Map();

io.on('connection', (socket) => {
  let userId = null;

  socket.on('register', (uid) => {
    userId = uid;
    if (!onlineUsers.has(uid)) onlineUsers.set(uid, new Set());
    onlineUsers.get(uid).add(socket.id);
    io.emit('user:online', uid);
  });

  socket.on('call:offer', ({ to, sdp, type }) => {
    const targetSockets = onlineUsers.get(to);
    if (targetSockets) {
      for (const sid of targetSockets) {
        io.to(sid).emit('call:offer', { from: userId, sdp, type });
      }
    }
  });

  socket.on('call:answer', ({ to, sdp, type }) => {
    const targetSockets = onlineUsers.get(to);
    if (targetSockets) {
      for (const sid of targetSockets) {
        io.to(sid).emit('call:answer', { from: userId, sdp, type });
      }
    }
  });

  socket.on('ice:candidate', ({ to, candidate }) => {
    const targetSockets = onlineUsers.get(to);
    if (targetSockets) {
      for (const sid of targetSockets) {
        io.to(sid).emit('ice:candidate', { from: userId, candidate });
      }
    }
  });

  socket.on('call:end', ({ to }) => {
    const targetSockets = onlineUsers.get(to);
    if (targetSockets) {
      for (const sid of targetSockets) {
        io.to(sid).emit('call:end', { from: userId });
      }
    }
  });

  socket.on('call:missed', ({ to }) => {
    const targetSockets = onlineUsers.get(to);
    if (targetSockets) {
      for (const sid of targetSockets) {
        io.to(sid).emit('call:missed', { from: userId });
      }
    }
  });

  socket.on('disconnect', () => {
    if (userId && onlineUsers.has(userId)) {
      onlineUsers.get(userId).delete(socket.id);
      if (onlineUsers.get(userId).size === 0) {
        onlineUsers.delete(userId);
        io.emit('user:offline', userId);
      }
    }
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Signaling server running on port ${PORT}`);
});

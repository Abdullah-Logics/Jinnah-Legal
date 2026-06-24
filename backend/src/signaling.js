import { Server } from 'socket.io';

let io;

export function setupSignaling(httpServer, corsOrigins) {
  io = new Server(httpServer, {
    cors: { origin: corsOrigins, credentials: true },
  });

  // Map userId → Set<socketId>
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

  return io;
}

export function getIO() {
  return io;
}

/**
 * @file server/socket.js
 * @description Socket.io server setup and event handling for real-time features.
 *
 * This file initializes the Socket.io server, attaches it to the main HTTP server,
 * and defines all real-time communication logic. This includes:
 * - User authentication via JWT for secure connections.
 * - Tracking online users.
 * - Handling private messaging between users.
 * - Broadcasting real-time notifications (e.g., new likes, comments, followers).
 * - Handling typing indicators for the chat feature.
 */

const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const User = require('./models/User'); // Assuming a User model for fetching user details

// Module-level variable to hold the io instance
let io;

// In-memory mapping of userId to socketId.
// In a production environment with multiple server instances,
// this should be replaced with a distributed solution like a Redis adapter.
const userSocketMap = new Map();

/**
 * Initializes the Socket.io server.
 * @param {http.Server} server - The HTTP server instance to attach Socket.io to.
 */
const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:3000',
      methods: ['GET', 'POST'],
    },
  });

  // Middleware for authenticating socket connections
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error('Authentication error: Token not provided.'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('name username profilePicture');

      if (!user) {
        return next(new Error('Authentication error: User not found.'));
      }

      // Attach user info to the socket object for easy access
      socket.user = user;
      next();
    } catch (error) {
      console.error('Socket authentication error:', error.message);
      next(new Error('Authentication error: Invalid token.'));
    }
  });

  // Main connection handler
  io.on('connection', (socket) => {
    console.log(`[Socket.io] User connected: ${socket.user.username} (${socket.id})`);

    // --- User Presence Management ---
    const userId = socket.user._id.toString();
    userSocketMap.set(userId, socket.id);

    // Broadcast the updated list of online users to all clients
    io.emit('onlineUsers', Array.from(userSocketMap.keys()));

    // --- Event Listeners ---

    // Handle user disconnection
    socket.on('disconnect', () => {
      console.log(`[Socket.io] User disconnected: ${socket.user.username} (${socket.id})`);
      userSocketMap.delete(userId);
      // Broadcast the updated list of online users
      io.emit('onlineUsers', Array.from(userSocketMap.keys()));
    });

    // Handle incoming private messages
    socket.on('privateMessage', ({ recipientId, content }) => {
      const recipientSocketId = userSocketMap.get(recipientId);

      if (recipientSocketId) {
        // Send the message to the specific recipient
        io.to(recipientSocketId).emit('privateMessage', {
          sender: {
            _id: socket.user._id,
            username: socket.user.username,
            profilePicture: socket.user.profilePicture,
          },
          content,
          createdAt: new Date(),
        });
      } else {
        // Optional: Handle offline messaging (e.g., save to DB, send push notification)
        console.log(`[Socket.io] User ${recipientId} is offline. Message not delivered in real-time.`);
        // Here you could add logic to store the message in the database
        // and mark it as 'unread'.
      }
    });

    // Handle typing indicators
    socket.on('typing', ({ recipientId }) => {
      const recipientSocketId = userSocketMap.get(recipientId);
      if (recipientSocketId) {
        socket.to(recipientSocketId).emit('typing', { senderId: userId });
      }
    });

    socket.on('stopTyping', ({ recipientId }) => {
      const recipientSocketId = userSocketMap.get(recipientId);
      if (recipientSocketId) {
        socket.to(recipientSocketId).emit('stopTyping', { senderId: userId });
      }
    });

    // Example of joining a room for notifications about a specific post
    socket.on('joinPostRoom', (postId) => {
        socket.join(`post_${postId}`);
        console.log(`[Socket.io] User ${socket.user.username} joined room for post ${postId}`);
    });

    socket.on('leavePostRoom', (postId) => {
        socket.leave(`post_${postId}`);
        console.log(`[Socket.io] User ${socket.user.username} left room for post ${postId}`);
    });

  });

  return io;
};

/**
 * Returns the Socket.io instance.
 * Throws an error if the instance has not been initialized.
 * @returns {Server} The Socket.io server instance.
 */
const getIo = () => {
  if (!io) {
    throw new Error('Socket.io not initialized!');
  }
  return io;
};

/**
 * Emits an event to a specific user if they are online.
 * @param {string} userId - The ID of the user to emit the event to.
 * @param {string} event - The name of the event.
 * @param {object} data - The data to send with the event.
 */
const emitToUser = (userId, event, data) => {
  const socketId = userSocketMap.get(userId.toString());
  if (socketId) {
    getIo().to(socketId).emit(event, data);
    console.log(`[Socket.io] Emitted '${event}' to user ${userId}`);
  } else {
    console.log(`[Socket.io] Could not emit '${event}' to user ${userId}: User is offline.`);
  }
};

/**
 * Emits an event to all clients in a specific room.
 * Useful for broadcasting updates related to a specific entity, like a post.
 * @param {string} room - The name of the room.
 * @param {string} event - The name of the event.
 * @param {object} data - The data to send with the event.
 */
const emitToRoom = (room, event, data) => {
    getIo().to(room).emit(event, data);
    console.log(`[Socket.io] Emitted '${event}' to room ${room}`);
};


module.exports = {
  initSocket,
  getIo,
  emitToUser,
  emitToRoom,
};
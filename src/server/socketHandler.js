```javascript
/**
 * @file src/server/socketHandler.js
 * @description Handles all real-time communication via Socket.io.
 * This includes user presence, real-time chat, and notifications.
 */

const jwt = require('jsonwebtoken');
const config = require('config');
const User = require('./models/User');
const Message = require('./models/Message');

// In-memory store for online users.
// In a production environment with multiple server instances,
// this should be replaced with a distributed store like Redis.
// Format: Map<userId, socketId>
const onlineUsers = new Map();

/**
 * Initializes and configures the Socket.io server and its event handlers.
 * @param {import('socket.io').Server} io The Socket.io server instance.
 */
const socketHandler = (io) => {
  /**
   * Middleware for authenticating socket connections using JWT.
   * The token is expected in `socket.handshake.auth.token`.
   */
  io.use(async (socket, next) => {
    const token = socket.handshake.auth.token;

    if (!token) {
      console.error('[Socket Auth] No token provided.');
      return next(new Error('Authentication error: No token provided.'));
    }

    try {
      const decoded = jwt.verify(token, config.get('jwtSecret'));
      const user = await User.findById(decoded.user.id).select('-password');

      if (!user) {
        console.error(`[Socket Auth] User not found for ID: ${decoded.user.id}`);
        return next(new Error('Authentication error: User not found.'));
      }

      // Attach the authenticated user object to the socket instance
      socket.user = user;
      next();
    } catch (err) {
      console.error('[Socket Auth] Invalid token:', err.message);
      return next(new Error('Authentication error: Invalid token.'));
    }
  });

  /**
   * Main connection handler. This is triggered once a client is authenticated
   * and successfully connects.
   */
  io.on('connection', (socket) => {
    console.log(`[Socket.io] User connected: ${socket.user.name} (ID: ${socket.user.id})`);

    // --- User Presence System ---

    // Add user to the online list
    onlineUsers.set(socket.user.id.toString(), socket.id);

    // Join a private room identified by the user's ID.
    // This allows for direct messaging and targeted notifications.
    socket.join(socket.user.id.toString());

    // Broadcast to all other clients that this user is now online
    socket.broadcast.emit('user:online', { userId: socket.user.id });

    // Send the current list of all online users to the newly connected client
    socket.emit('users:online', Array.from(onlineUsers.keys()));

    // --- Real-time Chat ---

    /**
     * Listens for a client sending a chat message.
     * Persists the message to the database and relays it to the recipient.
     * @param {object} payload - The message payload.
     * @param {string} payload.recipientId - The ID of the message recipient.
     * @param {string} payload.content - The text content of the message.
     * @param {function} callback - Acknowledgment callback to confirm receipt.
     */
    socket.on('chat:message:send', async ({ recipientId, content }, callback) => {
      if (!recipientId || !content || content.trim() === '') {
        return callback({ status: 'error', message: 'Recipient and content are required.' });
      }

      try {
        const message = new Message({
          sender: socket.user.id,
          recipient: recipientId,
          content: content.trim(),
        });

        await message.save();
        
        // Populate sender info for the recipient's client
        const populatedMessage = await Message.findById(message._id)
          .populate('sender', 'name avatar')
          .populate('recipient', 'name avatar');

        // Emit the message to the recipient's private room
        io.to(recipientId).emit('chat:message:receive', populatedMessage);

        // Acknowledge to the sender that the message was processed successfully
        callback({ status: 'ok', message: populatedMessage });

      } catch (error) {
        console.error('[Socket.io] Error sending chat message:', error);
        callback({ status: 'error', message: 'Server error: Failed to send message.' });
      }
    });

    /**
     * Handles typing indicators for the chat.
     */
    socket.on('chat:typing:start', ({ recipientId }) => {
      io.to(recipientId).emit('chat:typing:started', { from: socket.user.id });
    });

    socket.on('chat:typing:stop', ({ recipientId }) => {
      io.to(recipientId).emit('chat:typing:stopped', { from: socket.user.id });
    });

    // --- Real-time Notifications ---

    /**
     * Relays a new "like" notification to the post's author.
     * @param {object} payload - The notification payload.
     * @param {string} payload.postId - The ID of the liked post.
     * @param {string} payload.postAuthorId - The ID of the post's author.
     */
    socket.on('notification:like', ({ postId, postAuthorId }) => {
      // Avoid notifying users about their own actions
      if (socket.user.id.toString() !== postAuthorId) {
        const notification = {
          type: 'like',
          fromUser: {
            id: socket.user.id,
            name: socket.user.name,
            avatar: socket.user.avatar,
          },
          postId,
          createdAt: new Date(),
        };
        io.to(postAuthorId).emit('notification:new', notification);
      }
    });

    /**
     * Relays a new "comment" notification to the post's author.
     * @param {object} payload - The notification payload.
     * @param {string} payload.postId - The ID of the commented post.
     * @param {string} payload.postAuthorId - The ID of the post's author.
     * @param {string} payload.commentText - A snippet of the comment content.
     */
    socket.on('notification:comment', ({ postId, postAuthorId, commentText }) => {
      if (socket.user.id.toString() !== postAuthorId) {
        const notification = {
          type: 'comment',
          fromUser: {
            id: socket.user.id,
            name: socket.user.name,
            avatar: socket.user.avatar,
          },
          postId,
          commentText,
          createdAt: new Date(),
        };
        io.to(postAuthorId).emit('notification:new', notification);
      }
    });

    // --- Disconnect Handler ---

    /**
     * Cleans up when a user disconnects.
     */
    socket.on('disconnect', () => {
      console.log(`[Socket.io] User disconnected: ${socket.user.name} (ID: ${socket.user.id})`);
      
      // Remove user from the online list
      onlineUsers.delete(socket.user.id.toString());

      // Broadcast to all other clients that this user is now offline
      socket.broadcast.emit('user:offline', { userId: socket.user.id });
    });
  });
};

module.exports = socketHandler;
```
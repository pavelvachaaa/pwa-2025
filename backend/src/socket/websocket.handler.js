const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const chatService = require('@services/chat.service');
const logger = require('@utils/logger');
const userService = require('../services/user.service');

class WebSocketHandler {
  constructor() {
    this.io = null;
    this.connectedUsers = new Map(); // userId -> Set of socketIds
    this.userSockets = new Map(); // socketId -> userId
    this.conversationRooms = new Map(); // conversationId -> Set of userIds
  }

  initialize(server) {
    this.io = new Server(server, {
      cors: {
        origin: ['http://localhost:3000', 'http://localhost:3001', "https://chat.pavel-vacha.cz"],
        credentials: true
      }
    });

    // Authentication middleware
    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth?.token;

        if (!token) {
          throw new Error('Authentication token required');
        }

        // TODO: Teď nemužu z frontendu accessnout secure httpCookie (domyslet) 
        // /api/v1/auth/getToken
        // const decoded = jwt.verify(token, process.env.JWT_SECRET);
        // socket.userId = decoded.userId;
        socket.userId = "2ee76d5b-6d3d-4f08-8f93-0319b944c040"

        logger.info({ userId: socket.userId, socketId: socket.id }, 'WebSocket authentication successful');
        next();
      } catch (error) {
        logger.error({ error: error.message }, 'WebSocket authentication failed');
        next(new Error('Authentication failed'));
      }
    });

    this.io.on('connection', (socket) => {
      this.handleConnection(socket);
    });

    logger.info('WebSocket server initialized');
  }

  handleConnection(socket) {
    const userId = socket.userId;

    logger.info({ userId, socketId: socket.id }, 'User connected to WebSocket');

    if (!this.connectedUsers.has(userId)) {
      this.connectedUsers.set(userId, new Set());
    }
    this.connectedUsers.get(userId).add(socket.id);
    this.userSockets.set(socket.id, userId);

    this.updateUserPresence(userId, 'online');

    this.setupEventHandlers(socket);

    socket.on('disconnect', () => {
      this.handleDisconnection(socket);
    });
  }

  setupEventHandlers(socket) {
    const userId = socket.userId;

    // Join conversation room
    socket.on('conversation:join', async (data) => {
      try {
        const { conversationId } = data;

        // Verify user is participant in the conversation
        const conversation = await chatService.getConversationById?.(conversationId, userId);
        if (!conversation) {
          socket.emit('error', { message: 'Cannot join conversation: not a participant' });
          return;
        }

        socket.join(conversationId);

        // Track conversation membership
        if (!this.conversationRooms.has(conversationId)) {
          this.conversationRooms.set(conversationId, new Set());
        }
        this.conversationRooms.get(conversationId).add(userId);

        logger.debug({ userId, conversationId }, 'User joined conversation room');

        socket.emit('conversation:joined', { conversationId });
      } catch (error) {
        logger.error({ error: error.message, userId }, 'Error joining conversation');
        socket.emit('error', { message: 'Failed to join conversation' });
      }
    });

    // Leave conversation room
    socket.on('conversation:leave', (data) => {
      const { conversationId } = data;
      socket.leave(conversationId);

      if (this.conversationRooms.has(conversationId)) {
        this.conversationRooms.get(conversationId).delete(userId);
        if (this.conversationRooms.get(conversationId).size === 0) {
          this.conversationRooms.delete(conversationId);
        }
      }

      logger.debug({ userId, conversationId }, 'User left conversation room');
    });

    // Send message
    socket.on('message:send', async (data) => {
      try {
        const { conversationId, content, messageType, replyTo } = data;

        const result = await chatService.sendMessage(userId, {
          conversationId,
          content,
          messageType,
          replyTo
        });

        // Emit to all users in the conversation
        this.io.to(conversationId).emit('message:new', {
          message: result.message,
          conversationId
        });

        logger.debug({ userId, conversationId, messageId: result.message.id }, 'Message sent and broadcast');

      } catch (error) {
        logger.error({ error: error.message, userId, data }, 'Error sending message');
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // Edit message
    socket.on('message:edit', async (data) => {
      try {
        const { messageId, content } = data;

        const result = await chatService.editMessage(messageId, userId, content);

        // Get conversation participants to broadcast the edit
        const conversationId = result.message.conversation_id;
        this.io.to(conversationId).emit('message:edited', {
          message: result.message,
          conversationId
        });

        logger.debug({ userId, messageId }, 'Message edited and broadcast');

      } catch (error) {
        logger.error({ error: error.message, userId, data }, 'Error editing message');
        socket.emit('error', { message: 'Failed to edit message' });
      }
    });

    // Delete message
    socket.on('message:delete', async (data) => {
      try {
        const { messageId } = data;

        await chatService.deleteMessage(messageId, userId);

        // Broadcast deletion (we'll need to track conversation ID)
        // For now, we'll emit to all connected users - this could be optimized
        socket.broadcast.emit('message:deleted', { messageId });

        logger.debug({ userId, messageId }, 'Message deleted and broadcast');

      } catch (error) {
        logger.error({ error: error.message, userId, data }, 'Error deleting message');
        socket.emit('error', { message: 'Failed to delete message' });
      }
    });

    // Add reaction
    socket.on('message:react', async (data) => {
      try {
        const { messageId, emoji } = data;

        await chatService.addReaction(messageId, userId, emoji);

        // Broadcast reaction (we'll need to track conversation ID)
        socket.broadcast.emit('message:reaction_added', { messageId, userId, emoji });

        logger.debug({ userId, messageId, emoji }, 'Reaction added and broadcast');

      } catch (error) {
        logger.error({ error: error.message, userId, data }, 'Error adding reaction');
        socket.emit('error', { message: 'Failed to add reaction' });
      }
    });

    // Remove reaction
    socket.on('message:unreact', async (data) => {
      try {
        const { messageId, emoji } = data;

        await chatService.removeReaction(messageId, userId, emoji);

        // Broadcast reaction removal
        socket.broadcast.emit('message:reaction_removed', { messageId, userId, emoji });

        logger.debug({ userId, messageId, emoji }, 'Reaction removed and broadcast');

      } catch (error) {
        logger.error({ error: error.message, userId, data }, 'Error removing reaction');
        socket.emit('error', { message: 'Failed to remove reaction' });
      }
    });

    // Typing indicators
    socket.on('typing:start', async (data) => {
      try {
        const { conversationId } = data;

        await chatService.setTyping(conversationId, userId, true);

        // Broadcast typing to others in the conversation
        socket.to(conversationId).emit('typing:user_started', { conversationId, userId });

        logger.debug({ userId, conversationId }, 'User started typing');

      } catch (error) {
        logger.error({ error: error.message, userId, data }, 'Error setting typing indicator');
      }
    });

    socket.on('typing:stop', async (data) => {
      try {
        const { conversationId } = data;

        await chatService.setTyping(conversationId, userId, false);

        // Broadcast typing stop to others in the conversation
        socket.to(conversationId).emit('typing:user_stopped', { conversationId, userId });

        logger.debug({ userId, conversationId }, 'User stopped typing');

      } catch (error) {
        logger.error({ error: error.message, userId, data }, 'Error removing typing indicator');
      }
    });

    // Mark messages as read
    socket.on('conversation:mark_read', async (data) => {
      try {
        const { conversationId } = data;

        await chatService.markConversationAsRead(conversationId, userId);

        // Broadcast read status to others in the conversation
        socket.to(conversationId).emit('conversation:read_by_user', { conversationId, userId, readAt: new Date() });

        logger.debug({ userId, conversationId }, 'Conversation marked as read');

      } catch (error) {
        logger.error({ error: error.message, userId, data }, 'Error marking conversation as read');
        socket.emit('error', { message: 'Failed to mark as read' });
      }
    });

    // Presence updates
    socket.on('presence:update', async (data) => {
      try {
        const { status } = data;

        await this.updateUserPresence(userId, status);

        logger.debug({ userId, status }, 'User presence updated');

      } catch (error) {
        logger.error({ error: error.message, userId, data }, 'Error updating presence');
      }
    });
  }

  handleDisconnection(socket) {
    const userId = socket.userId;

    logger.info({ userId, socketId: socket.id }, 'User disconnected from WebSocket');

    if (this.connectedUsers.has(userId)) {
      this.connectedUsers.get(userId).delete(socket.id);
      if (this.connectedUsers.get(userId).size === 0) {
        this.connectedUsers.delete(userId);

        this.updateUserPresence(userId, 'offline');
      }
    }

    this.userSockets.delete(socket.id);

    for (const [conversationId, userSet] of this.conversationRooms.entries()) {
      userSet.delete(userId);
      if (userSet.size === 0) {
        this.conversationRooms.delete(conversationId);
      }
    }
  }

  async updateUserPresence(userId, status) {
    try {
      await userService.updateUserPresence(userId, status);

      // Broadcast presence update to all connected users
      this.io.emit('presence:user_updated', {
        userId,
        status,
        lastSeen: status === 'offline' ? new Date() : null
      });

    } catch (error) {
      logger.error({ error: error.message, userId, status }, 'Error updating user presence');
    }
  }

  // Helper method to check if user is online
  isUserOnline(userId) {
    return this.connectedUsers.has(userId) && this.connectedUsers.get(userId).size > 0;
  }

  // Helper method to get online users in a conversation
  getOnlineUsersInConversation(conversationId) {
    const users = this.conversationRooms.get(conversationId);
    return users ? Array.from(users).filter(userId => this.isUserOnline(userId)) : [];
  }

  // Method to send notification to specific user
  sendToUser(userId, event, data) {
    const socketIds = this.connectedUsers.get(userId);
    if (socketIds) {
      socketIds.forEach(socketId => {
        const socket = this.io.sockets.sockets.get(socketId);
        if (socket) {
          socket.emit(event, data);
        }
      });
    }
  }
}

module.exports = new WebSocketHandler();
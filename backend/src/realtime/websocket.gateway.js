const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const logger = require('@utils/logger').child({ module: 'ws-gateway' });
const { toWsError } = require('@utils/error-mapper');
const config = require('@/config');

class WebSocketGateway {
  constructor(chatService, userService) {
    this.io = null;
    this.chatService = chatService;
    this.userService = userService;
    this.connectedUsers = new Map();
    this.userSockets = new Map();
    this.conversationRooms = new Map();
  }

  initialize(server) {
    this.io = new Server(server, {
      cors: {
        origin: config.corsOrigins,
        credentials: true,
      },
    });

    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth?.token;

        if (!token) {
          throw new Error('Authentication token required');
        }

        const decoded = jwt.verify(token, config.jwt.secret);
        logger.debug({ decoded }, 'JWT token decoded successfully');

        socket.userId = decoded.sub;

        if (!socket.userId) {
          logger.error({ decoded }, 'No sub (user ID) found in JWT token');
          throw new Error('Invalid token: no user ID found');
        }

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

    if (!userId) {
      logger.error({ socketId: socket.id }, 'User ID is null or undefined in WebSocket connection');
      socket.disconnect();
      return;
    }

    if (!this.connectedUsers.has(userId)) {
      this.connectedUsers.set(userId, new Set());
    }
    this.connectedUsers.get(userId).add(socket.id);
    this.userSockets.set(socket.id, userId);

    logger.debug({ userId }, 'Setting user presence to online');
    this.updateUserPresence(userId, 'online');

    this.setupEventHandlers(socket);

    socket.on('disconnect', () => {
      this.handleDisconnection(socket);
    });
  }

  setupEventHandlers(socket) {
    const userId = socket.userId;

    socket.on('conversation:join', async (data) => {
      try {
        const { conversationId } = data;

        logger.debug({ userId, conversationId }, 'Attempting to join conversation');

        const conversation = await this.chatService.getConversationById(conversationId, userId);
        logger.debug({ userId, conversationId, conversation: !!conversation }, 'Conversation lookup result');

        if (!conversation) {
          logger.warn({ userId, conversationId }, 'User attempted to join conversation they are not a participant in');
          socket.emit('error', toWsError(new Error('Cannot join conversation: not a participant')));
          return;
        }

        socket.join(conversationId);

        if (!this.conversationRooms.has(conversationId)) {
          this.conversationRooms.set(conversationId, new Set());
        }
        this.conversationRooms.get(conversationId).add(userId);

        logger.debug({ userId, conversationId }, 'User joined conversation room');

        socket.emit('conversation:joined', { conversationId });
      } catch (error) {
        logger.error({ error: error.message, userId, conversationId: data?.conversationId }, 'Error joining conversation');
        socket.emit('error', toWsError(error));
      }
    });

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

    socket.on('message:send', async (data) => {
      try {
        const { conversationId, content, messageType, replyTo } = data;

        const result = await this.chatService.sendMessage(userId, {
          conversationId,
          content,
          messageType,
          replyTo,
        });

        this.io.to(conversationId).emit('message:new', {
          message: result.message,
          conversationId,
        });

        logger.debug({ userId, conversationId, messageId: result.message.id }, 'Message sent and broadcast');
      } catch (error) {
        logger.error({ error: error.message, userId, data }, 'Error sending message');
        socket.emit('error', toWsError(error));
      }
    });

    socket.on('message:edit', async (data) => {
      try {
        const { messageId, content } = data;

        const result = await this.chatService.editMessage(messageId, userId, content);

        const conversationId = result.message.conversation_id;
        this.io.to(conversationId).emit('message:edited', {
          message: result.message,
          conversationId,
        });

        logger.debug({ userId, messageId }, 'Message edited and broadcast');
      } catch (error) {
        logger.error({ error: error.message, userId, data }, 'Error editing message');
        socket.emit('error', toWsError(error));
      }
    });

    socket.on('message:delete', async (data) => {
      try {
        const { messageId } = data;

        const message = await this.chatService.getMessageById(messageId, userId);
        await this.chatService.deleteMessage(messageId, userId);

        this.io.to(message?.conversation_id).emit('message:deleted', { messageId });

        logger.debug({ userId, messageId }, 'Message deleted and broadcast');
      } catch (error) {
        logger.error({ error: error.message, userId, data }, 'Error deleting message');
        socket.emit('error', toWsError(error));
      }
    });

    socket.on('message:react', async (data) => {
      try {
        const { messageId, emoji } = data;

        await this.chatService.addReaction(messageId, userId, emoji);

        const message = await this.chatService.getMessageById(messageId, userId);
        this.io.to(message?.conversation_id).emit('message:reaction_added', { messageId, userId, emoji });
      } catch (error) {
        logger.error({ error: error.message, userId, data }, 'Error adding reaction');
        socket.emit('error', toWsError(error));
      }
    });

    socket.on('message:unreact', async (data) => {
      try {
        const { messageId, emoji } = data;

        await this.chatService.removeReaction(messageId, userId, emoji);

        const message = await this.chatService.getMessageById(messageId, userId);
        if (message && message.conversation_id) {
          this.io.to(message.conversation_id).emit('message:reaction_removed', { messageId, userId, emoji });
        }

        logger.debug({ userId, messageId, emoji }, 'Reaction removed and broadcast');
      } catch (error) {
        logger.error({ error: error.message, userId, data }, 'Error removing reaction');
        socket.emit('error', toWsError(error));
      }
    });

    socket.on('typing:start', async (data) => {
      try {
        const { conversationId } = data;
        socket.to(conversationId).emit('typing:user_started', { conversationId, userId });
        logger.debug({ userId, conversationId }, 'User started typing');
      } catch (error) {
        logger.error({ error: error.message, userId, data }, 'Error setting typing indicator');
      }
    });

    socket.on('typing:stop', async (data) => {
      try {
        const { conversationId } = data;
        socket.to(conversationId).emit('typing:user_stopped', { conversationId, userId });
        logger.debug({ userId, conversationId }, 'User stopped typing');
      } catch (error) {
        logger.error({ error: error.message, userId, data }, 'Error removing typing indicator');
      }
    });

    socket.on('conversation:mark_read', async (data) => {
      try {
        const { conversationId } = data;

        await this.chatService.markConversationAsRead(conversationId, userId);

        socket.to(conversationId).emit('conversation:read_by_user', { conversationId, userId, readAt: new Date() });

        logger.debug({ userId, conversationId }, 'Conversation marked as read');
      } catch (error) {
        logger.error({ error: error.message, userId, data }, 'Error marking conversation as read');
        socket.emit('error', toWsError(error));
      }
    });

    socket.on('user:logout', async () => {
      try {
        await this.updateUserPresence(userId, 'offline');
        logger.debug({ userId }, 'User logged out and presence updated to offline');
        setTimeout(() => socket.disconnect(true), 50);
      } catch (error) {
        logger.error({ error: error.message, userId }, 'Error during logout');
      }
    });

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
      if (!userId || !status) {
        logger.error({ userId, status }, 'Cannot update presence: invalid parameters');
        return;
      }

      await this.userService.updateUserPresence(userId, status);

      const presenceData = {
        userId,
        status,
        lastSeen: status === 'offline' ? new Date() : null,
      };

      logger.debug({ presenceData }, 'Broadcasting presence update to all users');
      this.io.emit('presence:user_updated', presenceData);
    } catch (error) {
      logger.error({ error: error.message, userId, status }, 'Error updating user presence');
    }
  }

  isUserOnline(userId) {
    return this.connectedUsers.has(userId) && this.connectedUsers.get(userId).size > 0;
  }

  getOnlineUsersInConversation(conversationId) {
    const users = this.conversationRooms.get(conversationId);
    return users ? Array.from(users).filter(userId => this.isUserOnline(userId)) : [];
  }

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

module.exports = WebSocketGateway;
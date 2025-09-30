const { Server } = require('socket.io');
const logger = require('@utils/logger').child({ module: 'ws-gateway' });
const config = require('@/config');

const { createAuthMiddleware } = require('./websocket.auth');
const ConnectionManager = require('./connection-manager');
const MessageHandlers = require('./event-handlers/message.handlers');
const ConversationHandlers = require('./event-handlers/conversation.handlers');
const TypingHandlers = require('./event-handlers/typing.handlers');
const PresenceHandlers = require('./event-handlers/presence.handlers');

class WebSocketGateway {
  constructor(chatService, userService) {
    this.io = null;
    this.chatService = chatService;
    this.userService = userService;
    this.connectionManager = new ConnectionManager(userService);
    this.messageHandlers = null;
    this.conversationHandlers = null;
    this.typingHandlers = null;
    this.presenceHandlers = null;
  }

  initialize(server) {
    this.io = new Server(server, {
      cors: {
        origin: config.corsOrigins,
        credentials: true,
      },
    });

    this.messageHandlers = new MessageHandlers(this.chatService, this.io);
    this.conversationHandlers = new ConversationHandlers(this.chatService, this.connectionManager);
    this.typingHandlers = new TypingHandlers();
    this.presenceHandlers = new PresenceHandlers(this.connectionManager, this.io);

    this.io.use(createAuthMiddleware());
    this.io.on('connection', (socket) => this.#handleConnection(socket));

    logger.info('WebSocket server initialized');
  }

  #handleConnection(socket) {
    const userId = socket.userId;

    logger.info({ userId, socketId: socket.id }, 'User connected to WebSocket');

    if (!userId) {
      logger.error({ socketId: socket.id }, 'User ID is null or undefined in WebSocket connection');
      socket.disconnect();
      return;
    }

    this.connectionManager.registerUser(userId, socket.id);
    this.connectionManager.updateUserPresence(userId, 'online', this.io);
    this.#setupEventHandlers(socket);

    socket.on('disconnect', () => this.#handleDisconnection(socket));
  }

  #setupEventHandlers(socket) {
    const userId = socket.userId;

    socket.on('conversation:join', (data) =>
      this.conversationHandlers.handleJoinConversation(socket, userId, data)
    );
    socket.on('conversation:leave', (data) =>
      this.conversationHandlers.handleLeaveConversation(socket, userId, data)
    );
    socket.on('conversation:mark_read', (data) =>
      this.conversationHandlers.handleMarkRead(socket, userId, data)
    );

    socket.on('message:send', (data) =>
      this.messageHandlers.handleSendMessage(socket, userId, data)
    );
    socket.on('message:edit', (data) =>
      this.messageHandlers.handleEditMessage(socket, userId, data)
    );
    socket.on('message:delete', (data) =>
      this.messageHandlers.handleDeleteMessage(socket, userId, data)
    );
    socket.on('message:react', (data) =>
      this.messageHandlers.handleAddReaction(socket, userId, data)
    );
    socket.on('message:unreact', (data) =>
      this.messageHandlers.handleRemoveReaction(socket, userId, data)
    );

    socket.on('typing:start', (data) =>
      this.typingHandlers.handleTypingStart(socket, userId, data)
    );
    socket.on('typing:stop', (data) =>
      this.typingHandlers.handleTypingStop(socket, userId, data)
    );

    socket.on('presence:update', (data) =>
      this.presenceHandlers.handlePresenceUpdate(socket, userId, data)
    );
    socket.on('user:logout', () =>
      this.presenceHandlers.handleLogout(socket, userId)
    );
  }

  #handleDisconnection(socket) {
    const userId = socket.userId;

    logger.info({ userId, socketId: socket.id }, 'User disconnected from WebSocket');

    const isLastSocket = this.connectionManager.unregisterUser(userId, socket.id);
    if (isLastSocket) {
      this.connectionManager.updateUserPresence(userId, 'offline', this.io);
    }

    this.connectionManager.cleanupUserConversations(userId);
  }

  isUserOnline(userId) {
    return this.connectionManager.isUserOnline(userId);
  }

  getOnlineUsersInConversation(conversationId) {
    return this.connectionManager.getOnlineUsersInConversation(conversationId);
  }

  sendToUser(userId, event, data) {
    const socketIds = this.connectionManager.getUserSocketIds(userId);
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

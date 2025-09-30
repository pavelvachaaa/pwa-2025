const logger = require('@utils/logger').child({ module: 'connection-manager' });

class ConnectionManager {
  constructor(userService) {
    this.userService = userService;
    this.connectedUsers = new Map();
    this.userSockets = new Map();
    this.conversationRooms = new Map();
  }

  registerUser(userId, socketId) {
    if (!this.connectedUsers.has(userId)) {
      this.connectedUsers.set(userId, new Set());
    }
    this.connectedUsers.get(userId).add(socketId);
    this.userSockets.set(socketId, userId);

    logger.debug({ userId, socketId }, 'User socket registered');
  }

  unregisterUser(userId, socketId) {
    if (this.connectedUsers.has(userId)) {
      this.connectedUsers.get(userId).delete(socketId);
      if (this.connectedUsers.get(userId).size === 0) {
        this.connectedUsers.delete(userId);
        return true; 
      }
    }

    this.userSockets.delete(socketId);
    return false;
  }

  addToConversation(conversationId, userId) {
    if (!this.conversationRooms.has(conversationId)) {
      this.conversationRooms.set(conversationId, new Set());
    }
    this.conversationRooms.get(conversationId).add(userId);

    logger.debug({ userId, conversationId }, 'User added to conversation room');
  }

  removeFromConversation(conversationId, userId) {
    if (this.conversationRooms.has(conversationId)) {
      this.conversationRooms.get(conversationId).delete(userId);
      if (this.conversationRooms.get(conversationId).size === 0) {
        this.conversationRooms.delete(conversationId);
      }
    }

    logger.debug({ userId, conversationId }, 'User removed from conversation room');
  }

  cleanupUserConversations(userId) {
    for (const [conversationId, userSet] of this.conversationRooms.entries()) {
      userSet.delete(userId);
      if (userSet.size === 0) {
        this.conversationRooms.delete(conversationId);
      }
    }

    logger.debug({ userId }, 'User cleaned up from all conversation rooms');
  }

  isUserOnline(userId) {
    return this.connectedUsers.has(userId) && this.connectedUsers.get(userId).size > 0;
  }

  getOnlineUsersInConversation(conversationId) {
    const users = this.conversationRooms.get(conversationId);
    return users ? Array.from(users).filter(userId => this.isUserOnline(userId)) : [];
  }

  getUserSocketIds(userId) {
    return this.connectedUsers.get(userId);
  }

  async updateUserPresence(userId, status, io) {
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
      io.emit('presence:user_updated', presenceData);
    } catch (error) {
      logger.error({ error: error.message, userId, status }, 'Error updating user presence');
    }
  }
}

module.exports = ConnectionManager;

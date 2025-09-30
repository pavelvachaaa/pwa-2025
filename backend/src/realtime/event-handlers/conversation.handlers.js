const logger = require('@utils/logger').child({ module: 'conversation-handlers' });
const { toWsError } = require('@utils/error-mapper');

class ConversationHandlers {
  constructor(chatService, connectionManager) {
    this.chatService = chatService;
    this.connectionManager = connectionManager;
  }

  async handleJoinConversation(socket, userId, data) {
    try {
      const { conversationId } = data;

      const conversation = await this.chatService.getConversationById(conversationId, userId);

      if (!conversation) {
        logger.warn({ userId, conversationId }, 'User attempted to join conversation they are not a participant in');
        socket.emit('error', toWsError(new Error('Cannot join conversation: not a participant')));
        return;
      }

      socket.join(conversationId);
      this.connectionManager.addToConversation(conversationId, userId);

      logger.debug({ userId, conversationId }, 'User joined conversation room');
      socket.emit('conversation:joined', { conversationId });
    } catch (error) {
      logger.error({ error: error.message, userId, conversationId: data?.conversationId }, 'Error joining conversation');
      socket.emit('error', toWsError(error));
    }
  }

  handleLeaveConversation(socket, userId, data) {
    const { conversationId } = data;
    socket.leave(conversationId);
    this.connectionManager.removeFromConversation(conversationId, userId);

    logger.debug({ userId, conversationId }, 'User left conversation room');
  }

  async handleMarkRead(socket, userId, data) {
    try {
      const { conversationId } = data;

      await this.chatService.markConversationAsRead(conversationId, userId);

      socket.to(conversationId).emit('conversation:read_by_user', {
        conversationId,
        userId,
        readAt: new Date()
      });

      logger.debug({ userId, conversationId }, 'Conversation marked as read');
    } catch (error) {
      logger.error({ error: error.message, userId, data }, 'Error marking conversation as read');
      socket.emit('error', toWsError(error));
    }
  }
}

module.exports = ConversationHandlers;

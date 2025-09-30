const logger = require('@utils/logger').child({ module: 'typing-handlers' });

class TypingHandlers {
  handleTypingStart(socket, userId, data) {
    try {
      const { conversationId } = data;
      socket.to(conversationId).emit('typing:user_started', { conversationId, userId });
      logger.debug({ userId, conversationId }, 'User started typing');
    } catch (error) {
      logger.error({ error: error.message, userId, data }, 'Error setting typing indicator');
    }
  }

  handleTypingStop(socket, userId, data) {
    try {
      const { conversationId } = data;
      socket.to(conversationId).emit('typing:user_stopped', { conversationId, userId });
      logger.debug({ userId, conversationId }, 'User stopped typing');
    } catch (error) {
      logger.error({ error: error.message, userId, data }, 'Error removing typing indicator');
    }
  }
}

module.exports = TypingHandlers;

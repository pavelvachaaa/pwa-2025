const logger = require('@utils/logger').child({ module: 'message-handlers' });
const { toWsError } = require('@utils/error-mapper');

class MessageHandlers {
  constructor(chatService, io) {
    this.chatService = chatService;
    this.io = io;
  }

  async handleSendMessage(socket, userId, data) {
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
  }

  async handleEditMessage(socket, userId, data) {
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
  }

  async handleDeleteMessage(socket, userId, data) {
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
  }

  async handleAddReaction(socket, userId, data) {
    try {
      const { messageId, emoji } = data;

      await this.chatService.addReaction(messageId, userId, emoji);

      const message = await this.chatService.getMessageById(messageId, userId);
      this.io.to(message?.conversation_id).emit('message:reaction_added', { messageId, userId, emoji });

      logger.debug({ userId, messageId, emoji }, 'Reaction added and broadcast');
    } catch (error) {
      logger.error({ error: error.message, userId, data }, 'Error adding reaction');
      socket.emit('error', toWsError(error));
    }
  }

  async handleRemoveReaction(socket, userId, data) {
    try {
      const { messageId, emoji } = data;

      await this.chatService.removeReaction(messageId, userId, emoji);

      const message = await this.chatService.getMessageById(messageId, userId);
      if (message?.conversation_id) {
        this.io.to(message.conversation_id).emit('message:reaction_removed', { messageId, userId, emoji });
      }

      logger.debug({ userId, messageId, emoji }, 'Reaction removed and broadcast');
    } catch (error) {
      logger.error({ error: error.message, userId, data }, 'Error removing reaction');
      socket.emit('error', toWsError(error));
    }
  }
}

module.exports = MessageHandlers;

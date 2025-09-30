const logger = require('@utils/logger').child({ module: 'chat-service' });
const { ValidationError, NotFoundError, AuthorizationError } = require('@utils/errors');

class ChatService {
  constructor(chatRepository, userRepository) {
    this.chatRepo = chatRepository;
    this.userRepo = userRepository;
    this.idempotencyCache = new Map();
  }

  async createConversation(currentUserId, targetUserId) {
    try {
      if (currentUserId === targetUserId) {
        throw new ValidationError('Cannot create conversation with yourself');
      }

      const existing = await this.chatRepo.findConversationByParticipants(currentUserId, targetUserId);
      if (existing) {
        return { conversation: await this.chatRepo.getConversationById(existing.id, currentUserId) };
      }

      const targetUser = await this.userRepo.findById(targetUserId);
      if (!targetUser) {
        throw new NotFoundError('Target user');
      }

      const conversation = await this.chatRepo.createConversation({
        userAId: currentUserId,
        userBId: targetUserId,
        createdBy: currentUserId
      });

      return { conversation: await this.chatRepo.getConversationById(conversation.id, currentUserId) };
    } catch (error) {
      logger.error({ error: error.message, currentUserId, targetUserId }, 'Error creating conversation');
      throw error;
    }
  }

  async getUserConversations(userId) {
    try {
      const conversations = await this.chatRepo.getConversationsForUser(userId);
      return { conversations };
    } catch (error) {
      logger.error({ error: error.message, userId }, 'Error getting user conversations');
      throw error;
    }
  }

  async getConversationById(conversationId, userId) {
    try {
      const conversation = await this.chatRepo.getConversationById(conversationId, userId);
      if (!conversation) {
        throw new NotFoundError('Conversation');
      }
      return conversation;
    } catch (error) {
      logger.error({ error: error.message, conversationId, userId }, 'Error getting conversation by ID');
      throw error;
    }
  }

  async getConversationMessages(conversationId, userId, { limit = 50, offset = 0 } = {}) {
    try {
      const messages = await this.chatRepo.getMessagesForConversation(conversationId, userId, limit, offset);
      return { messages };
    } catch (error) {
      logger.error({ error: error.message, conversationId, userId }, 'Error getting conversation messages');
      throw error;
    }
  }

  async sendMessage(userId, { conversationId, content, messageType = 'text', replyTo = null, idempotencyKey = null }) {
    try {
      if (!content?.trim()) {
        throw new ValidationError('Message content is required');
      }

      // Check idempotency if enabled
      const config = require('@/config');
      if (config.IDEMPOTENCY_ENABLED && idempotencyKey) {
        const cached = this.idempotencyCache.get(idempotencyKey);
        if (cached) {
          logger.debug({ idempotencyKey, userId }, 'Returning cached message (idempotency)');
          return cached;
        }
      }

      // Verify user is participant
      const isParticipant = await this.chatRepo.isUserParticipant(conversationId, userId);
      if (!isParticipant) {
        throw new AuthorizationError('Not a participant in this conversation');
      }

      const message = await this.chatRepo.createMessage({
        conversationId,
        senderId: userId,
        content: content.trim(),
        messageType,
        replyTo
      });

      const result = { message: await this.getBasicMessageInfo(message) };

      // Cache result if idempotency enabled
      if (config.IDEMPOTENCY_ENABLED && idempotencyKey) {
        this.idempotencyCache.set(idempotencyKey, result);
        setTimeout(() => this.idempotencyCache.delete(idempotencyKey), 24 * 60 * 60 * 1000);
      }

      return result;
    } catch (error) {
      logger.error({ error: error.message, userId, conversationId, content }, 'Error sending message');
      throw error;
    }
  }

  async getBasicMessageInfo(message) {
    const sender = await this.chatRepo.getUserById(message.sender_id);
    return {
      ...message,
      sender_name: sender?.display_name || 'Unknown User'
    };
  }

  async getMessageById(messageId, userId) {
    try {
      return await this.chatRepo.getMessageById(messageId, userId);
    } catch (error) {
      logger.error({ error: error.message, messageId, userId }, 'Error getting message');
      throw error;
    }
  }

  async editMessage(messageId, userId, content) {
    try {
      if (!content?.trim()) {
        throw new ValidationError('Message content is required');
      }

      const message = await this.chatRepo.updateMessage(messageId, userId, content.trim());
      if (!message) {
        throw new NotFoundError('Message not found or you are not the sender');
      }

      return { message };
    } catch (error) {
      logger.error({ error: error.message, messageId, userId, content }, 'Error editing message');
      throw error;
    }
  }

  async deleteMessage(messageId, userId) {
    try {
      const message = await this.chatRepo.deleteMessage(messageId, userId);
      if (!message) {
        throw new NotFoundError('Message not found or you are not the sender');
      }

      return { success: true };
    } catch (error) {
      logger.error({ error: error.message, messageId, userId }, 'Error deleting message');
      throw error;
    }
  }

  async addReaction(messageId, userId, emoji) {
    try {
      if (!emoji?.trim()) {
        throw new ValidationError('Emoji is required');
      }

      await this.chatRepo.addReaction(messageId, userId, emoji.trim());
      return { success: true };
    } catch (error) {
      logger.error({ error: error.message, messageId, userId, emoji }, 'Error adding reaction');
      throw error;
    }
  }

  async removeReaction(messageId, userId, emoji) {
    try {
      if (!emoji?.trim()) {
        throw new ValidationError('Emoji is required');
      }

      await this.chatRepo.removeReaction(messageId, userId, emoji.trim());
      return { success: true };
    } catch (error) {
      logger.error({ error: error.message, messageId, userId, emoji }, 'Error removing reaction');
      throw error;
    }
  }

  async markConversationAsRead(conversationId, userId) {
    try {
      await this.chatRepo.markConversationAsRead(conversationId, userId);
      return { success: true };
    } catch (error) {
      logger.error({ error: error.message, conversationId, userId }, 'Error marking conversation as read');
      throw error;
    }
  }
}

module.exports = ChatService;
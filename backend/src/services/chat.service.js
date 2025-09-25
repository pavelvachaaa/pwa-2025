const chatRepository = require('@repositories/chat.repository');
const userRepository = require('@repositories/user.repository');
const logger = require('@utils/logger');

class ChatService {
  async createConversation(currentUserId, targetUserId) {
    try {
      if (currentUserId === targetUserId) {
        throw new Error('Cannot create conversation with yourself');
      }

      // Check if conversation already exists (using unordered pair)
      const existing = await chatRepository.findConversationByParticipants(currentUserId, targetUserId);
      if (existing) {
        return { conversation: await chatRepository.getConversationById(existing.id, currentUserId) };
      }

      // Verify target user exists
      const targetUser = await userRepository.findById(targetUserId);
      if (!targetUser) {
        throw new Error('Target user not found');
      }

      const conversation = await chatRepository.createConversation({
        userAId: currentUserId,
        userBId: targetUserId,
        createdBy: currentUserId
      });

      return { conversation: await chatRepository.getConversationById(conversation.id, currentUserId) };
    } catch (error) {
      logger.error({ error: error.message, currentUserId, targetUserId }, 'Error creating conversation');
      throw error;
    }
  }

  async getUserConversations(userId) {
    try {
      const conversations = await chatRepository.getConversationsForUser(userId);
      return { conversations };
    } catch (error) {
      logger.error({ error: error.message, userId }, 'Error getting user conversations');
      throw error;
    }
  }

  async getConversationById(conversationId, userId) {
    try {
      return await chatRepository.getConversationById(conversationId, userId);
    } catch (error) {
      logger.error({ error: error.message, conversationId, userId }, 'Error getting conversation by ID');
      throw error;
    }
  }

  async getConversationMessages(conversationId, userId, { limit = 50, offset = 0 } = {}) {
    try {
      const messages = await chatRepository.getMessagesForConversation(conversationId, userId, limit, offset);
      return { messages };
    } catch (error) {
      logger.error({ error: error.message, conversationId, userId }, 'Error getting conversation messages');
      throw error;
    }
  }

  async sendMessage(userId, { conversationId, content, messageType = 'text', replyTo = null }) {
    try {
      if (!content?.trim()) {
        throw new Error('Message content is required');
      }

      // Verify user is participant
      const conversation = await chatRepository.getConversationById(conversationId, userId);
      if (!conversation) {
        throw new Error('Conversation not found or user is not a participant');
      }

      const message = await chatRepository.createMessage({
        conversationId,
        senderId: userId,
        content: content.trim(),
        messageType,
        replyTo
      });

      // Clear any draft for this conversation
      await chatRepository.deleteDraft(conversationId, userId);

      // Get full message data with sender info
      const fullMessage = await this.getMessageById(message.id, userId);

      return { message: fullMessage };
    } catch (error) {
      logger.error({ error: error.message, userId, conversationId, content }, 'Error sending message');
      throw error;
    }
  }

  async getMessageById(messageId, userId) {
    try {
      // Get message with full data
      const result = await chatRepository.getMessagesForConversation(
        // We need to get the conversation ID first
        null, userId, 1, 0 // This is a bit inefficient, ideally we'd have a getMessageById method
      );

      // For now, let's create a dedicated method in repository
      return result.find(m => m.id === messageId);
    } catch (error) {
      logger.error({ error: error.message, messageId, userId }, 'Error getting message');
      throw error;
    }
  }

  async editMessage(messageId, userId, content) {
    try {
      if (!content?.trim()) {
        throw new Error('Message content is required');
      }

      const message = await chatRepository.updateMessage(messageId, userId, content.trim());
      if (!message) {
        throw new Error('Message not found or user is not the sender');
      }

      return { message };
    } catch (error) {
      logger.error({ error: error.message, messageId, userId, content }, 'Error editing message');
      throw error;
    }
  }

  async deleteMessage(messageId, userId) {
    try {
      const message = await chatRepository.deleteMessage(messageId, userId);
      if (!message) {
        throw new Error('Message not found or user is not the sender');
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
        throw new Error('Emoji is required');
      }

      await chatRepository.addReaction(messageId, userId, emoji.trim());
      return { success: true };
    } catch (error) {
      logger.error({ error: error.message, messageId, userId, emoji }, 'Error adding reaction');
      throw error;
    }
  }

  async removeReaction(messageId, userId, emoji) {
    try {
      if (!emoji?.trim()) {
        throw new Error('Emoji is required');
      }

      await chatRepository.removeReaction(messageId, userId, emoji.trim());
      return { success: true };
    } catch (error) {
      logger.error({ error: error.message, messageId, userId, emoji }, 'Error removing reaction');
      throw error;
    }
  }

  async markConversationAsRead(conversationId, userId) {
    try {
      await chatRepository.markConversationAsRead(conversationId, userId);
      return { success: true };
    } catch (error) {
      logger.error({ error: error.message, conversationId, userId }, 'Error marking conversation as read');
      throw error;
    }
  }


  async setTyping(conversationId, userId, isTyping) {
    try {
      if (isTyping) {
        await chatRepository.setTypingIndicator(conversationId, userId);
      } else {
        await chatRepository.removeTypingIndicator(conversationId, userId);
      }

      const typingUsers = await chatRepository.getTypingUsers(conversationId);
      return { typingUsers };
    } catch (error) {
      logger.error({ error: error.message, conversationId, userId, isTyping }, 'Error setting typing indicator');
      throw error;
    }
  }

  async saveDraft(conversationId, userId, content) {
    try {
      await chatRepository.saveDraft(conversationId, userId, content);
      return { success: true };
    } catch (error) {
      logger.error({ error: error.message, conversationId, userId, content }, 'Error saving draft');
      throw error;
    }
  }

  async getDraft(conversationId, userId) {
    try {
      const content = await chatRepository.getDraft(conversationId, userId);
      return { content };
    } catch (error) {
      logger.error({ error: error.message, conversationId, userId }, 'Error getting draft');
      throw error;
    }
  }

}

module.exports = new ChatService();
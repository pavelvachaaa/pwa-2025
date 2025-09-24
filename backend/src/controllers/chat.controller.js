const chatService = require('@services/chat.service');
const logger = require('@utils/logger');

class ChatController {
  // Get user's conversations
  async getConversations(req, res) {
    try {
      const userId = req.user.userId;
      const result = await chatService.getUserConversations(userId);

      res.json({
        success: true,
        data: result.conversations
      });
    } catch (error) {
      logger.error({ error: error.message, userId: req.user?.userId }, 'Error getting conversations');
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // Get messages for a conversation
  async getMessages(req, res) {
    try {
      const userId = req.user.userId;
      const { conversationId } = req.params;
      const { limit = 50, offset = 0 } = req.query;

      const result = await chatService.getConversationMessages(
        conversationId,
        userId,
        { limit: parseInt(limit), offset: parseInt(offset) }
      );

      res.json({
        success: true,
        data: result.messages
      });
    } catch (error) {
      logger.error({ error: error.message, conversationId: req.params.conversationId, userId: req.user?.userId }, 'Error getting messages');
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // Create direct conversation
  async createDirectConversation(req, res) {
    try {
      const userId = req.user.userId;
      const { targetUserId } = req.body;

      if (!targetUserId) {
        return res.status(400).json({
          success: false,
          error: 'Target user ID is required'
        });
      }

      const result = await chatService.createDirectConversation(userId, targetUserId);

      res.json({
        success: true,
        data: result.conversation
      });
    } catch (error) {
      logger.error({ error: error.message, userId: req.user?.userId, targetUserId: req.body?.targetUserId }, 'Error creating direct conversation');
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // Create group conversation
  async createGroupConversation(req, res) {
    try {
      const userId = req.user.userId;
      const { name, participants, avatarUrl } = req.body;

      if (!name || !name.trim()) {
        return res.status(400).json({
          success: false,
          error: 'Group name is required'
        });
      }

      const result = await chatService.createGroupConversation(userId, {
        name,
        participants: participants || [],
        avatarUrl
      });

      res.json({
        success: true,
        data: result.conversation
      });
    } catch (error) {
      logger.error({ error: error.message, userId: req.user?.userId, name: req.body?.name }, 'Error creating group conversation');
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // Send message (HTTP endpoint - WebSocket is preferred for real-time)
  async sendMessage(req, res) {
    try {
      const userId = req.user.userId;
      const { conversationId, content, messageType, replyTo } = req.body;

      if (!conversationId || !content || !content.trim()) {
        return res.status(400).json({
          success: false,
          error: 'Conversation ID and content are required'
        });
      }

      const result = await chatService.sendMessage(userId, {
        conversationId,
        content,
        messageType,
        replyTo
      });

      res.json({
        success: true,
        data: result.message
      });
    } catch (error) {
      logger.error({ error: error.message, userId: req.user?.userId, conversationId: req.body?.conversationId }, 'Error sending message');
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // Edit message
  async editMessage(req, res) {
    try {
      const userId = req.user.userId;
      const { messageId } = req.params;
      const { content } = req.body;

      if (!content || !content.trim()) {
        return res.status(400).json({
          success: false,
          error: 'Content is required'
        });
      }

      const result = await chatService.editMessage(messageId, userId, content);

      res.json({
        success: true,
        data: result.message
      });
    } catch (error) {
      logger.error({ error: error.message, messageId: req.params.messageId, userId: req.user?.userId }, 'Error editing message');
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // Delete message
  async deleteMessage(req, res) {
    try {
      const userId = req.user.userId;
      const { messageId } = req.params;

      await chatService.deleteMessage(messageId, userId);

      res.json({
        success: true,
        message: 'Message deleted successfully'
      });
    } catch (error) {
      logger.error({ error: error.message, messageId: req.params.messageId, userId: req.user?.userId }, 'Error deleting message');
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // Add reaction to message
  async addReaction(req, res) {
    try {
      const userId = req.user.userId;
      const { messageId } = req.params;
      const { emoji } = req.body;

      if (!emoji || !emoji.trim()) {
        return res.status(400).json({
          success: false,
          error: 'Emoji is required'
        });
      }

      await chatService.addReaction(messageId, userId, emoji);

      res.json({
        success: true,
        message: 'Reaction added successfully'
      });
    } catch (error) {
      logger.error({ error: error.message, messageId: req.params.messageId, userId: req.user?.userId }, 'Error adding reaction');
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // Remove reaction from message
  async removeReaction(req, res) {
    try {
      const userId = req.user.userId;
      const { messageId } = req.params;
      const { emoji } = req.body;

      if (!emoji || !emoji.trim()) {
        return res.status(400).json({
          success: false,
          error: 'Emoji is required'
        });
      }

      await chatService.removeReaction(messageId, userId, emoji);

      res.json({
        success: true,
        message: 'Reaction removed successfully'
      });
    } catch (error) {
      logger.error({ error: error.message, messageId: req.params.messageId, userId: req.user?.userId }, 'Error removing reaction');
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // Mark conversation as read
  async markAsRead(req, res) {
    try {
      const userId = req.user.userId;
      const { conversationId } = req.params;

      await chatService.markConversationAsRead(conversationId, userId);

      res.json({
        success: true,
        message: 'Conversation marked as read'
      });
    } catch (error) {
      logger.error({ error: error.message, conversationId: req.params.conversationId, userId: req.user?.userId }, 'Error marking conversation as read');
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // Get all users
  async getAllUsers(req, res) {
    try {
      const userId = req.user.userId;
      const { limit = 20 } = req.query;

      const result = await chatService.getAllUsers(userId, parseInt(limit));

      res.json({
        success: true,
        data: result.users
      });
    } catch (error) {
      logger.error({ error: error.message, userId: req.user?.userId }, 'Error getting all users');
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // Search users
  async searchUsers(req, res) {
    try {
      const userId = req.user.userId;
      const { q: query, limit = 20 } = req.query;

      if (!query || !query.trim()) {
        return res.json({
          success: true,
          data: []
        });
      }

      const result = await chatService.searchUsers(query, userId, parseInt(limit));

      res.json({
        success: true,
        data: result.users
      });
    } catch (error) {
      logger.error({ error: error.message, query: req.query.q, userId: req.user?.userId }, 'Error searching users');
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // Get/save drafts
  async getDraft(req, res) {
    try {
      const userId = req.user.userId;
      const { conversationId } = req.params;

      const result = await chatService.getDraft(conversationId, userId);

      res.json({
        success: true,
        data: { content: result.content }
      });
    } catch (error) {
      logger.error({ error: error.message, conversationId: req.params.conversationId, userId: req.user?.userId }, 'Error getting draft');
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  async saveDraft(req, res) {
    try {
      const userId = req.user.userId;
      const { conversationId } = req.params;
      const { content } = req.body;

      await chatService.saveDraft(conversationId, userId, content || '');

      res.json({
        success: true,
        message: 'Draft saved successfully'
      });
    } catch (error) {
      logger.error({ error: error.message, conversationId: req.params.conversationId, userId: req.user?.userId }, 'Error saving draft');
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // Get user presence
  async getUsersPresence(req, res) {
    try {
      const { userIds } = req.query;

      if (!userIds) {
        return res.status(400).json({
          success: false,
          error: 'User IDs are required'
        });
      }

      const userIdArray = Array.isArray(userIds) ? userIds : userIds.split(',');
      const result = await chatService.getUsersPresence(userIdArray);

      res.json({
        success: true,
        data: result.presences
      });
    } catch (error) {
      logger.error({ error: error.message, userIds: req.query.userIds }, 'Error getting users presence');
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
}

module.exports = new ChatController();
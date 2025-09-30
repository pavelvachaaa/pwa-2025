const logger = require('@utils/logger').child({ module: 'chat-controller' });

class ChatController {
  constructor(chatService, websocketGateway) {
    this.chatService = chatService;
    this.wsGateway = websocketGateway;
  }

  async getConversations(req, res, next) {
    try {
      const userId = req.user.id;
      const result = await this.chatService.getUserConversations(userId);

      res.json({
        success: true,
        data: result.conversations
      });
    } catch (error) {
      next(error);
    }
  }

  async getMessages(req, res, next) {
    try {
      const userId = req.user.id;
      const { conversationId } = req.params;
      const { limit = 50, offset = 0 } = req.query;

      const result = await this.chatService.getConversationMessages(
        conversationId,
        userId,
        { limit: parseInt(limit), offset: parseInt(offset) }
      );

      res.json({
        success: true,
        data: result.messages
      });
    } catch (error) {
      next(error);
    }
  }

  async createConversation(req, res, next) {
    try {
      const userId = req.user.id;
      const { targetUserId } = req.body;

      if (!targetUserId) {
        return res.status(400).json({
          success: false,
          error: 'Target user ID is required'
        });
      }

      const result = await this.chatService.createConversation(userId, targetUserId);

      if (this.wsGateway) {
        const conversationForInitiator = await this.chatService.getConversationById(result.conversation.id, userId);
        const conversationForTarget = await this.chatService.getConversationById(result.conversation.id, targetUserId);

        this.wsGateway.sendToUser(userId, 'conversation:created', {
          conversation: conversationForInitiator,
          isInitiator: true
        });
        this.wsGateway.sendToUser(targetUserId, 'conversation:created', {
          conversation: conversationForTarget,
          isInitiator: false
        });

        logger.debug({ userId, targetUserId, conversationId: result.conversation.id }, 'Conversation created notification sent via WebSocket');
      }

      res.json({
        success: true,
        data: result.conversation
      });
    } catch (error) {
      next(error);
    }
  }

  async sendMessage(req, res, next) {
    try {
      const userId = req.user.id;
      const { conversationId, content, messageType, replyTo } = req.body;
      const idempotencyKey = req.headers['idempotency-key'];

      if (!conversationId || !content || !content.trim()) {
        return res.status(400).json({
          success: false,
          error: 'Conversation ID and content are required'
        });
      }

      const result = await this.chatService.sendMessage(userId, {
        conversationId,
        content,
        messageType,
        replyTo,
        idempotencyKey
      });

      res.json({
        success: true,
        data: result.message
      });
    } catch (error) {
      next(error);
    }
  }

  async editMessage(req, res, next) {
    try {
      const userId = req.user.id;
      const { messageId } = req.params;
      const { content } = req.body;

      if (!content || !content.trim()) {
        return res.status(400).json({
          success: false,
          error: 'Content is required'
        });
      }

      const result = await this.chatService.editMessage(messageId, userId, content);

      res.json({
        success: true,
        data: result.message
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteMessage(req, res, next) {
    try {
      const userId = req.user.id;
      const { messageId } = req.params;

      await this.chatService.deleteMessage(messageId, userId);

      res.json({
        success: true,
        message: 'Message deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  async addReaction(req, res, next) {
    try {
      const userId = req.user.id;
      const { messageId } = req.params;
      const { emoji } = req.body;

      if (!emoji || !emoji.trim()) {
        return res.status(400).json({
          success: false,
          error: 'Emoji is required'
        });
      }

      await this.chatService.addReaction(messageId, userId, emoji);

      res.json({
        success: true,
        message: 'Reaction added successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  async removeReaction(req, res, next) {
    try {
      const userId = req.user.id;
      const { messageId } = req.params;
      const { emoji } = req.body;

      if (!emoji || !emoji.trim()) {
        return res.status(400).json({
          success: false,
          error: 'Emoji is required'
        });
      }

      await this.chatService.removeReaction(messageId, userId, emoji);

      res.json({
        success: true,
        message: 'Reaction removed successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  async markAsRead(req, res, next) {
    try {
      const userId = req.user.id;
      const { conversationId } = req.params;

      await this.chatService.markConversationAsRead(conversationId, userId);

      res.json({
        success: true,
        message: 'Conversation marked as read'
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = ChatController;
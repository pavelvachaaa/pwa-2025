const express = require('express');
const chatController = require('@controllers/chat.controller');
const { authMiddleware, requireActiveUser } = require('@middlewares/auth.middleware');

const router = express.Router();

// Apply auth middleware to all chat routes
router.use(authMiddleware);
router.use(requireActiveUser);

// Conversations
router.get('/conversations', chatController.getConversations);
router.post('/conversations/direct', chatController.createDirectConversation);
router.post('/conversations/group', chatController.createGroupConversation);

// Messages
router.get('/conversations/:conversationId/messages', chatController.getMessages);
router.post('/messages', chatController.sendMessage);
router.put('/messages/:messageId', chatController.editMessage);
router.delete('/messages/:messageId', chatController.deleteMessage);

// Message interactions
router.post('/messages/:messageId/reactions', chatController.addReaction);
router.delete('/messages/:messageId/reactions', chatController.removeReaction);

// Read status
router.post('/conversations/:conversationId/read', chatController.markAsRead);

// Drafts
router.get('/conversations/:conversationId/draft', chatController.getDraft);
router.post('/conversations/:conversationId/draft', chatController.saveDraft);



module.exports = router;
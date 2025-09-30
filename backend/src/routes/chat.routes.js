const express = require('express');
const { authMiddleware, requireActiveUser } = require('@middlewares/auth.middleware');
const container = require('@/di/container');

const router = express.Router();

const chatController = container.resolve('chatController');

router.use(authMiddleware);
router.use(requireActiveUser);

router.get('/conversations', (req, res, next) => chatController.getConversations(req, res, next));
router.post('/conversations', (req, res, next) => chatController.createConversation(req, res, next));

router.get('/conversations/:conversationId/messages', (req, res, next) => chatController.getMessages(req, res, next));
router.post('/messages', (req, res, next) => chatController.sendMessage(req, res, next));
router.put('/messages/:messageId', (req, res, next) => chatController.editMessage(req, res, next));
router.delete('/messages/:messageId', (req, res, next) => chatController.deleteMessage(req, res, next));

router.post('/messages/:messageId/reactions', (req, res, next) => chatController.addReaction(req, res, next));
router.delete('/messages/:messageId/reactions', (req, res, next) => chatController.removeReaction(req, res, next));

router.post('/conversations/:conversationId/read', (req, res, next) => chatController.markAsRead(req, res, next));

module.exports = router;
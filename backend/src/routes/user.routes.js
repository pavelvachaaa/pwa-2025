const express = require('express');
const { authMiddleware, requireActiveUser } = require('@middlewares/auth.middleware');
const container = require('@/di/container');

const router = express.Router();

const userController = container.resolve('userController');

router.use(authMiddleware);
router.use(requireActiveUser);

router.get('/', (req, res, next) => userController.getAllUsers(req, res, next));
router.get('/search', (req, res, next) => userController.searchUsers(req, res, next));
router.get('/presence', (req, res, next) => userController.getUsersPresence(req, res, next));

module.exports = router;
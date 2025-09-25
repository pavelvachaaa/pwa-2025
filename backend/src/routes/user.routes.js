const express = require('express');
const { authMiddleware, requireActiveUser } = require('@middlewares/auth.middleware');
const userController = require('../controllers/user.controller');

const router = express.Router();

router.use(authMiddleware);
router.use(requireActiveUser);


router.get('/', userController.getAllUsers);
router.get('/search', userController.searchUsers);
router.get('/presence', userController.getUsersPresence);

module.exports = router;
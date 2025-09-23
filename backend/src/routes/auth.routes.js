const express = require('express');
const authController = require('@controllers/auth.controller');
const { authMiddleware, requireActiveUser } = require('@middlewares/auth.middleware');
const { authRateLimit, refreshRateLimit, generalRateLimit } = require('@middlewares/rate-limit');

const router = express.Router();

router.use(generalRateLimit);

router.post('/register', authRateLimit, authController.register);

router.post('/login', authRateLimit, authController.login);

router.post('/google/start', authController.googleStart);

router.post('/google/callback', authController.googleCallback);

router.post('/google/id-token', authRateLimit, authController.googleIdToken);

router.post('/refresh', refreshRateLimit, authController.refresh);

router.post('/logout', authMiddleware, authController.logout);

router.post('/logout-all', authMiddleware, authController.logoutAll);

router.get('/me', authMiddleware, requireActiveUser, authController.me);

module.exports = router;
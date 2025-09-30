const express = require('express');
const { authMiddleware, requireActiveUser } = require('@middlewares/auth.middleware');
const { authRateLimit, refreshRateLimit, generalRateLimit } = require('@middlewares/rate-limit');
const { validate } = require('@middlewares/validate');
const schemas = require('@/schemas/auth.schemas');
const container = require('@/di/container');

const router = express.Router();

const authController = container.resolve('authController');

router.use(generalRateLimit);

router.post('/register', authRateLimit, validate(schemas.register), (req, res, next) => authController.register(req, res, next));

router.post('/login', authRateLimit, validate(schemas.login), (req, res, next) => authController.login(req, res, next));

router.post('/google/start', (req, res, next) => authController.googleStart(req, res, next));

router.post('/google/callback', validate(schemas.googleCallback), (req, res, next) => authController.googleCallback(req, res, next));

router.post('/google/id-token', authRateLimit, validate(schemas.googleIdToken), (req, res, next) => authController.googleIdToken(req, res, next));

router.post('/refresh', refreshRateLimit, validate(schemas.refreshToken), (req, res, next) => authController.refresh(req, res, next));

router.post('/logout', authMiddleware, (req, res, next) => authController.logout(req, res, next));

router.post('/logout-all', authMiddleware, (req, res, next) => authController.logoutAll(req, res, next));

router.get('/me', authMiddleware, requireActiveUser, (req, res, next) => authController.me(req, res, next));

router.get('/getToken', authMiddleware, requireActiveUser, (req, res, next) => authController.getToken(req, res, next));

module.exports = router;
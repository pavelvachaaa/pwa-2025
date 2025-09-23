const { verifyToken } = require('@utils/jwt/jwt');
const { user: userRepo } = require('@repositories/auth.repository');
const logger = require('@utils/logger').child({ module: 'authMiddleware' });

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: 'Access token required'
    });
  }

  const token = authHeader.substring(7);

  try {
    const decoded = verifyToken(token);

    req.user = {
      id: decoded.sub,
      sessionId: decoded.sid,
      email: decoded.email,
      name: decoded.name
    };

    logger.debug({
      userId: decoded.sub,
      sessionId: decoded.sid
    }, 'User authenticated via JWT');

    next();
  } catch (error) {
    logger.warn({
      err: error,
      token: token.substring(0, 20) + '...'
    }, 'JWT verification failed');

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: 'Access token expired',
        code: 'TOKEN_EXPIRED'
      });
    }

    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        error: 'Invalid access token',
        code: 'TOKEN_INVALID'
      });
    }

    return res.status(401).json({
      success: false,
      error: 'Authentication failed'
    });
  }
}

async function requireActiveUser(req, res, next) {
  try {
    if (!req.user?.id) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }

    const user = await userRepo.findById(req.user.id);

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'User not found'
      });
    }

    if (!user.is_active) {
      return res.status(403).json({
        success: false,
        error: 'User account is inactive'
      });
    }

    req.user.user = user;
    next();
  } catch (error) {
    logger.error({ err: error, userId: req.user?.id }, 'Failed to verify active user');
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
}

function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    req.user = null;
    return next();
  }

  const token = authHeader.substring(7);

  try {
    const decoded = verifyToken(token);

    req.user = {
      id: decoded.sub,
      sessionId: decoded.sid,
      email: decoded.email,
      name: decoded.name
    };

    logger.debug({
      userId: decoded.sub,
      sessionId: decoded.sid
    }, 'Optional auth: User authenticated via JWT');
  } catch (error) {
    logger.debug({
      err: error,
      token: token.substring(0, 20) + '...'
    }, 'Optional auth: JWT verification failed, continuing without auth');

    req.user = null;
  }

  next();
}

module.exports = {
  authMiddleware,
  requireActiveUser,
  optionalAuth
};
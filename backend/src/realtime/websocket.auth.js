const jwt = require('jsonwebtoken');
const logger = require('@utils/logger').child({ module: 'ws-auth' });
const config = require('@/config');

function createAuthMiddleware() {
  return (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;

      if (!token) {
        throw new Error('Authentication token required');
      }

      const decoded = jwt.verify(token, config.jwt.secret);
      socket.userId = decoded.sub;

      if (!socket.userId) {
        logger.error({ decoded }, 'No sub (user ID) found in JWT token');
        throw new Error('Invalid token: no user ID found');
      }

      logger.info({ userId: socket.userId, socketId: socket.id }, 'WebSocket authentication successful');
      next();
    } catch (error) {
      logger.error({ error: error.message }, 'WebSocket authentication failed');
      next(new Error('Authentication failed'));
    }
  };
}

module.exports = { createAuthMiddleware };

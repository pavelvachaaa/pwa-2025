const logger = require('@utils/logger').child({ module: 'di-bootstrap' });
const container = require('@/di/container');

const ChatRepository = require('@repositories/impl/chat.repository');
const UserRepository = require('@repositories/impl/user.repository');
const OAuthRepository = require('@repositories/impl/oauth.repository');
const SessionRepository = require('@repositories/impl/session.repository');

const ChatService = require('@services/chat.service');
const UserService = require('@services/user.service');
const AuthService = require('@services/auth.service');

const WebSocketGateway = require('@/realtime/websocket.gateway');
const ChatController = require('@controllers/chat.controller');
const AuthController = require('@controllers/auth.controller');
const UserController = require('@controllers/user.controller');

function registerDependencies(pool) {
  container.registerValue('db', pool);

  container.register('chatRepository', (c) =>
    new ChatRepository(c.resolve('db'), logger.child({ repo: 'chat' }))
  );

  container.register('userRepository', (c) =>
    new UserRepository(c.resolve('db'), logger.child({ repo: 'user' }))
  );

  container.register('oauthRepository', (c) =>
    new OAuthRepository(c.resolve('db'), logger.child({ repo: 'oauth' }))
  );

  container.register('sessionRepository', (c) =>
    new SessionRepository(c.resolve('db'), logger.child({ repo: 'session' }))
  );

  container.register('chatService', (c) =>
    new ChatService(c.resolve('chatRepository'), c.resolve('userRepository'))
  );

  container.register('userService', (c) =>
    new UserService(c.resolve('userRepository'))
  );

  container.register('authService', (c) =>
    new AuthService(
      c.resolve('userRepository'),
      c.resolve('oauthRepository'),
      c.resolve('sessionRepository')
    )
  );

  container.register('websocketGateway', (c) =>
    new WebSocketGateway(c.resolve('chatService'), c.resolve('userService'))
  );

  container.register('chatController', (c) =>
    new ChatController(c.resolve('chatService'), c.resolve('websocketGateway'))
  );

  container.register('authController', (c) =>
    new AuthController(c.resolve('authService'))
  );

  container.register('userController', (c) =>
    new UserController(c.resolve('userService'))
  );

  logger.debug('All dependencies registered successfully');
}

module.exports = { registerDependencies };

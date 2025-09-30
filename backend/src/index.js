require('module-alias/register');

const express = require('express');
const { createServer } = require('http');
const cors = require('cors');
const cookieParser = require('cookie-parser');

const config = require('@/config');
const logger = require('@utils/logger').child({ module: 'server' });
const container = require('@/di/container');

const errorHandler = require('@middlewares/error.middleware');

const pool = require('@/database/config');
container.registerValue('db', pool);

// 2. Repositories
const ChatRepository = require('@repositories/impl/chat.repository');
const UserRepository = require('@repositories/impl/user.repository');
const OAuthRepository = require('@repositories/impl/oauth.repository');
const SessionRepository = require('@repositories/impl/session.repository');

container.register('chatRepository', (c) => {
  return new ChatRepository(c.resolve('db'));
});

container.register('userRepository', (c) => {
  return new UserRepository(c.resolve('db'));
});

container.register('oauthRepository', (c) => {
  return new OAuthRepository(c.resolve('db'));
});

container.register('sessionRepository', (c) => {
  return new SessionRepository(c.resolve('db'));
});

// 3. Services
const ChatService = require('@services/chat.service');
const UserService = require('@services/user.service');
const AuthService = require('@services/auth.service');

container.register('chatService', (c) => {
  return new ChatService(c.resolve('chatRepository'), c.resolve('userRepository'));
});

container.register('userService', (c) => {
  return new UserService(c.resolve('userRepository'));
});

container.register('authService', (c) => {
  return new AuthService(
    c.resolve('userRepository'),
    c.resolve('oauthRepository'),
    c.resolve('sessionRepository')
  );
});

const WebSocketGateway = require('@/realtime/websocket.gateway');

container.register('websocketGateway', (c) => {
  return new WebSocketGateway(c.resolve('chatService'), c.resolve('userService'));
});

const ChatController = require('@controllers/chat.controller');
const AuthController = require('@controllers/auth.controller');
const UserController = require('@controllers/user.controller');

container.register('chatController', (c) => {
  return new ChatController(c.resolve('chatService'), c.resolve('websocketGateway'));
});

container.register('authController', (c) => {
  return new AuthController(c.resolve('authService'));
});

container.register('userController', (c) => {
  return new UserController(c.resolve('userService'));
});


const app = express();
const server = createServer(app);
const PORT = config.PORT;
const API_PREFIX = config.API_PREFIX;

const websocketGateway = container.resolve('websocketGateway');
websocketGateway.initialize(server);

const corsOptions = {
  origin: config.corsOrigins,
  credentials: true,
};

app.use((req, res, next) => {
  logger.debug({ method: req.method, url: req.url }, 'Incoming request');
  next();
});

app.use(cookieParser());
app.use(cors(corsOptions));
app.use(express.json());

const authRoutes = require('@routes/auth.routes');
const chatRoutes = require('@routes/chat.routes');
const userRoutes = require('@routes/user.routes');

app.use(`${API_PREFIX}/auth`, authRoutes);
app.use(`${API_PREFIX}/chat`, chatRoutes);
app.use(`${API_PREFIX}/users`, userRoutes);

app.get('/', (req, res) => {
  logger.info({ message: 'Handling root request' });
  res.json({
    message: 'PWA Real-time Messenger API',
    version: '1.0.0',
    websocket: 'enabled',
  });
});

app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');

    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: 'connected',
      websocket: 'enabled',
    });
  } catch (error) {
    logger.error({ error }, 'Health check failed');
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      database: 'disconnected',
      error: error.message,
    });
  }
});

app.use(errorHandler);

server.listen(PORT, () => {
  logger.info({ port: PORT, env: config.NODE_ENV }, 'Server running with WebSocket support');
});

process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(async () => {
    await pool.end();
    logger.info('Server closed');
    process.exit(0);
  });
});

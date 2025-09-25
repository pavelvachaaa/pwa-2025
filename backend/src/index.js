require('module-alias/register');

const express = require('express');
const { createServer } = require('http');
const logger = require('@utils/logger');
const cors = require('cors')
const cookieParser = require('cookie-parser');

const authRoutes = require('@routes/auth.routes');
const userRoutes = require('@routes/user.routes');
const chatRoutes = require('@routes/chat.routes');
const websocketHandler = require('@/socket/websocket.handler');

const app = express();
const server = createServer(app);
const PORT = process.env.PORT || 3000;

const API_PREFIX = process.env.API_PREFIX || '/api/v1';

const corsOptions = {
  origin: ['http://localhost:3000', 'http://localhost:3001', "https://chat.pavel-vacha.cz"],
  credentials: true
}

websocketHandler.initialize(server);

app.use((req, res, next) => {
  logger.debug({ method: req.method, url: req.url }, 'Incoming request');
  next();
});

app.use(cookieParser());
app.use(cors(corsOptions));
app.use(express.json());

app.use((req, res, next) => {
  // logger.debug({
  //   body: req.body,
  //   headers: req.headers,
  //   contentType: req.get('Content-Type')
  // }, 'Request body debug');
  next();
});

// Routes
app.use(`${API_PREFIX}/auth`, authRoutes);
app.use(`${API_PREFIX}/chat`, chatRoutes);
app.use(`${API_PREFIX}/users`, userRoutes);

app.get('/', (req, res) => {
  logger.info({ message: 'Handling root request' });
  res.json({
    message: 'PWA Real-time Messenger API',
    version: '1.0.0',
    websocket: 'enabled'
  });
});

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

server.listen(PORT, () => {
  logger.info({ port: PORT }, 'Server running with WebSocket support');
});

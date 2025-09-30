const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const compression = require('compression');

const config = require('@/config');
const logger = require('@utils/logger').child({ module: 'app' });
const errorHandler = require('@middlewares/error.middleware');

function createApp(pool) {
  const authRoutes = require('@routes/auth.routes');
  const chatRoutes = require('@routes/chat.routes');
  const userRoutes = require('@routes/user.routes');
  const app = express();

  app.use((req, res, next) => {
    logger.debug({ method: req.method, url: req.url }, 'Incoming request');
    next();
  });

  app.use(compression());
  app.use(cookieParser());
  app.use(cors({
    origin: config.corsOrigins,
    credentials: true,
  }));
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: false, limit: '1mb' }));

  app.use(`${config.API_PREFIX}/auth`, authRoutes);
  app.use(`${config.API_PREFIX}/chat`, chatRoutes);
  app.use(`${config.API_PREFIX}/users`, userRoutes);

  app.get('/', (req, res) => {
    res.json({
      message: 'PainChat API',
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

  app.use((req, res, next) => {
    res.status(404).json({
      error: {
        code: 'NOT_FOUND',
        path: req.originalUrl
      }
    });
  });

  app.use(errorHandler);

  return app;
}

module.exports = { createApp };

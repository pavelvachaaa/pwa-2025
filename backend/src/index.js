require('module-alias/register');

const { createServer } = require('http');
const config = require('@/config');
const logger = require('@utils/logger').child({ module: 'server' });
const pool = require('@/database/config');
const container = require('@/di/container');

const { registerDependencies } = require('@/bootstrap/dependencies');
const { createApp } = require('@/app');

registerDependencies(pool);

const app = createApp(pool);
const server = createServer(app);

const websocketGateway = container.resolve('websocketGateway');
websocketGateway.initialize(server);

server.listen(config.PORT, () => {
  logger.info({ port: config.PORT, env: config.NODE_ENV }, 'Server running with WebSocket support');
});

process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(async () => {
    await pool.end();
    logger.info('Server closed');
    process.exit(0);
  });
});

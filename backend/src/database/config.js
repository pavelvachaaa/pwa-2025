const { Pool } = require('pg');
const logger = require('@utils/logger').child({ module: 'database' });

const config = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'appdb',
  user: process.env.DB_USER || 'app',
  password: process.env.DB_PASSWORD || 'app',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
};

const pool = new Pool(config);

pool.on('connect', () => {
  logger.debug('Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  logger.error({ err }, 'Unexpected error on idle client');
  process.exit(-1);
});

module.exports = pool;
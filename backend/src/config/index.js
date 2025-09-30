const { z } = require('zod');

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3000),
  API_PREFIX: z.string().default('/api/v1'),

  DB_HOST: z.string().default('localhost'),
  DB_PORT: z.coerce.number().default(5432),
  DB_NAME: z.string().default('appdb'),
  DB_USER: z.string().default('app'),
  DB_PASSWORD: z.string().default('app'),
  DB_POOL_MAX: z.coerce.number().default(20),
  DB_IDLE_TIMEOUT_MS: z.coerce.number().default(30000),
  DB_CONNECTION_TIMEOUT_MS: z.coerce.number().default(2000),

  JWT_SECRET: z.string().min(1),
  JWT_REFRESH_SECRET: z.string().min(1).optional(),
  JWT_ACCESS_EXPIRY: z.string().default('15m'),
  JWT_REFRESH_EXPIRY: z.string().default('7d'),

  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),

  CORS_ORIGINS: z.string().default('http://localhost:3000,http://localhost:3001'),

  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),
  LOG_PRETTY: z.string().default('false'),

  IDEMPOTENCY_ENABLED: z.string().default('false'),
  RATE_LIMIT_ENABLED: z.string().default('false'),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(60000),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().default(100),
});

let config = null;

function loadConfig() {
  if (config) return config;

  try {
    const parsed = envSchema.parse(process.env);

    config = {
      ...parsed,
      isDevelopment: parsed.NODE_ENV === 'development',
      isProduction: parsed.NODE_ENV === 'production',
      isTest: parsed.NODE_ENV === 'test',
      corsOrigins: parsed.CORS_ORIGINS.split(',').map(o => o.trim()),
      IDEMPOTENCY_ENABLED: parsed.IDEMPOTENCY_ENABLED === 'true',
      RATE_LIMIT_ENABLED: parsed.RATE_LIMIT_ENABLED === 'true',
      db: {
        host: parsed.DB_HOST,
        port: parsed.DB_PORT,
        database: parsed.DB_NAME,
        user: parsed.DB_USER,
        password: parsed.DB_PASSWORD,
        ssl: parsed.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
        max: parsed.DB_POOL_MAX,
        idleTimeoutMillis: parsed.DB_IDLE_TIMEOUT_MS,
        connectionTimeoutMillis: parsed.DB_CONNECTION_TIMEOUT_MS,
      },
      jwt: {
        secret: parsed.JWT_SECRET,
        refreshSecret: parsed.JWT_REFRESH_SECRET || parsed.JWT_SECRET,
        accessExpiry: parsed.JWT_ACCESS_EXPIRY,
        refreshExpiry: parsed.JWT_REFRESH_EXPIRY,
      },
    };

    return config;
  } catch (error) {
    if (error.name === 'ZodError' && error.errors) {
      error.errors.forEach(err => {
        console.error(`  - ${err.path.join('.')}: ${err.message}`);
      });
      console.error('\nPlease check your .env file and try again.\n');
      process.exit(1);
    }
    console.error('Configuration error:', error);
    throw error;
  }
}

module.exports = loadConfig();
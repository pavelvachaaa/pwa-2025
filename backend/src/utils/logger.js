const pino = require('pino');

function createLogger() {
  const isProd = process.env.NODE_ENV === 'production';
  const level = process.env.LOG_LEVEL || (isProd ? 'info' : 'debug');
  const pretty = process.env.LOG_PRETTY ? process.env.LOG_PRETTY === 'true' : !isProd;

  const options = {
    level,
    timestamp: pino.stdTimeFunctions.isoTime,
  };

  if (pretty) {
    const prettyTransport = require('pino-pretty')({
      colorize: true,
      translateTime: 'SYS:standard',
      singleLine: true,
    });
    return pino(options, prettyTransport);
  }

  return pino(options);
}

const logger = createLogger();


module.exports = logger;


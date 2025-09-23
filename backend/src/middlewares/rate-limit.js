const logger = require('@utils/logger').child({ module: 'rateLimit' });

const attempts = new Map();

function createRateLimit(options = {}) {
  const {
    windowMs = 15 * 60 * 1000, // 15 minutes
    max = 50, // 5 attempts per window
    skipSuccessfulRequests = false,
    keyGenerator = (req) => req.ip,
    message = 'Too many requests, please try again later'
  } = options;

  return (req, res, next) => {
    const key = keyGenerator(req);
    const now = Date.now();

    if (!attempts.has(key)) {
      attempts.set(key, { count: 0, resetTime: now + windowMs });
    }

    const record = attempts.get(key);

    if (now > record.resetTime) {
      record.count = 0;
      record.resetTime = now + windowMs;
    }

    if (record.count >= max) {
      logger.warn({
        key: key.substring(0, 10) + '...',
        count: record.count,
        max,
        url: req.url
      }, 'Rate limit exceeded');

      return res.status(429).json({
        success: false,
        error: message,
        retryAfter: Math.ceil((record.resetTime - now) / 1000)
      });
    }

    record.count++;

    const originalSend = res.send;
    res.send = function(data) {
      if (skipSuccessfulRequests && res.statusCode < 400) {
        record.count--;
      }
      originalSend.call(this, data);
    };

    next();
  };
}

const authRateLimit = createRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // 5 login attempts per 15 minutes per IP
  skipSuccessfulRequests: true,
  message: 'Too many authentication attempts, please try again later'
});

const refreshRateLimit = createRateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 1000, // 10 refresh attempts per minute per IP
  message: 'Too many token refresh attempts, please try again later'
});

const generalRateLimit = createRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // 100 requests per 15 minutes per IP
  message: 'Too many requests, please try again later'
});

function cleanup() {
  const now = Date.now();
  for (const [key, record] of attempts.entries()) {
    if (now > record.resetTime) {
      attempts.delete(key);
    }
  }
}

setInterval(cleanup, 5 * 60 * 1000);

module.exports = {
  createRateLimit,
  authRateLimit,
  refreshRateLimit,
  generalRateLimit
};
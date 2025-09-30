const logger = require('@utils/logger').child({ module: 'error-middleware' });
const { toHttpError, getStatusCode } = require('@utils/error-mapper');

function errorHandler(err, req, res, next) {
  const statusCode = getStatusCode(err);
  const isDevelopment = process.env.NODE_ENV === 'development';
  const errorResponse = toHttpError(err, isDevelopment);

  logger.error({
    err,
    statusCode,
    path: req.path,
    method: req.method,
    userId: req.user?.id,
  }, 'Request error');

  res.status(statusCode).json(errorResponse);
}

module.exports = errorHandler;
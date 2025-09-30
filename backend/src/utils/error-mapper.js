const logger = require('@utils/logger').child({ module: 'error-mapper' });
const { AppError } = require('./errors');

/**
 * Map errors to HTTP response format
 */
function toHttpError(error, includeStack = false) {
  if (error instanceof AppError) {
    return {
      success: false,
      error: error.message,
      code: error.code,
      details: error.details,
      ...(includeStack && { stack: error.stack }),
    };
  }

  // Handle Zod validation errors
  if (error.name === 'ZodError') {
    return {
      success: false,
      error: 'Validation failed',
      code: 'VALIDATION_ERROR',
      details: error.errors,
    };
  }

  // Handle database errors
  if (error.code === '23505') {
    return {
      success: false,
      error: 'Resource already exists',
      code: 'DUPLICATE_ENTRY',
    };
  }

  if (error.code === '23503') {
    return {
      success: false,
      error: 'Referenced resource not found',
      code: 'FOREIGN_KEY_VIOLATION',
    };
  }

  // Generic error
  logger.error({ error }, 'Unhandled error in error mapper');
  return {
    success: false,
    error: 'Internal server error',
    code: 'INTERNAL_ERROR',
    ...(includeStack && { stack: error.stack }),
  };
}

/**
 * Map errors to WebSocket event format
 */
function toWsError(error) {
  if (error instanceof AppError) {
    return {
      error: error.message,
      code: error.code,
      details: error.details,
    };
  }

  // Handle Zod validation errors
  if (error.name === 'ZodError') {
    return {
      error: 'Validation failed',
      code: 'VALIDATION_ERROR',
      details: error.errors,
    };
  }

  // Generic error
  logger.error({ error }, 'Unhandled error in WS error mapper');
  return {
    error: 'An error occurred',
    code: 'INTERNAL_ERROR',
  };
}

/**
 * Get HTTP status code from error
 */
function getStatusCode(error) {
  if (error instanceof AppError) {
    return error.statusCode;
  }

  // Database constraint violations
  if (error.code === '23505' || error.code === '23503') {
    return 409;
  }

  return 500;
}

module.exports = {
  toHttpError,
  toWsError,
  getStatusCode,
};
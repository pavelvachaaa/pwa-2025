const logger = require('@utils/logger').child({ module: 'validate' });

function validate(schema) {
  return (req, res, next) => {
    try {
      logger.debug({
        body: req.body,
        url: req.url,
        method: req.method
      }, 'Validating request');

      const result = schema.safeParse(req.body);

      if (!result.success) {
        const errors = result.error?.errors?.map(err => ({
          field: err.path.join('.'),
          message: err.message
        })) || [{ field: 'unknown', message: 'Validation failed' }];

        logger.warn({
          errors,
          url: req.url,
          method: req.method,
          rawError: result.error
        }, 'Validation failed');

        return res.status(400).json({
          error: 'Validation failed',
          details: errors
        });
      }

      req.body = result.data;
      next();
    } catch (error) {
      logger.error({
        err: error,
        body: req.body,
        url: req.url,
        method: req.method
      }, 'Validation middleware error');
      res.status(500).json({
        error: 'Internal server error'
      });
    }
  };
}

module.exports = { validate };
const authService = require('@services/auth.service');
const { validate } = require('@middlewares/validate');
const schemas = require('@/schemas/auth.schemas');
const logger = require('@utils/logger').child({ module: 'authController' });

class AuthController {
  _setCookies(res, accessToken, refreshToken) {
    const isProduction = process.env.NODE_ENV === 'production';

    const cookieOptions = {
      httpOnly: true,
      secure: isProduction, // HTTPS only in production
      sameSite: isProduction ? 'none' : 'lax',
      path: '/', // Available on all paths
      domain: isProduction ? undefined : undefined // Let browser decide in dev
    };

    logger.debug({
      isProduction,
      cookieOptions
    }, 'Setting authentication cookies');

    // Set access token cookie
    res.cookie('accessToken', accessToken, {
      ...cookieOptions,
      maxAge: 15 * 60 * 1000 // 15 minutes
    });

    // Set refresh token cookie
    res.cookie('refreshToken', refreshToken, {
      ...cookieOptions,
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });
  }

  _clearCookies(res) {
    const isProduction = process.env.NODE_ENV === 'production';

    const cookieOptions = {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'lax',
      path: '/'
    };

    res.clearCookie('accessToken', cookieOptions);
    res.clearCookie('refreshToken', cookieOptions);
  }
  async register(req, res, next) {
    try {
      const result = await authService.register(req.body, req);

      // Set HTTP-only cookies
      this._setCookies(res, result.accessToken, result.refreshToken);

      res.status(201).json({
        success: true,
        data: {
          user: result.user
        }
      });
    } catch (error) {
      logger.error({ err: error }, 'Registration failed');

      if (error.message === 'User with this email already exists') {
        return res.status(409).json({
          success: false,
          error: 'User with this email already exists'
        });
      }

      next(error);
    }
  }

  async getToken(req, res, next) {
    const token = req.cookies?.accessToken;

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Access token required'
      });
    }

    try {
      const decoded = verifyToken(token);
      return res.status(200).json({
        success: true,
        data: token
      });
    } catch (e) {

      logger.warn({
        err: error,
        token: token.substring(0, 20) + '...'
      }, 'JWT verification failed');

      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          error: 'Access token expired',
          code: 'TOKEN_EXPIRED'
        });
      }

      next(error);


    }

  }


  async login(req, res, next) {
    try {
      const result = await authService.login(req.body, req);

      // Set HTTP-only cookies
      this._setCookies(res, result.accessToken, result.refreshToken);

      res.status(200).json({
        success: true,
        data: {
          user: result.user
        }
      });
    } catch (error) {
      logger.error({ err: error }, 'Login failed');

      if (error.message === 'Invalid email or password') {
        return res.status(401).json({
          success: false,
          error: 'Invalid email or password'
        });
      }

      next(error);
    }
  }

  async googleStart(req, res, next) {
    try {
      const result = await authService.googleStart();

      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error({ err: error }, 'Google OAuth start failed');

      if (error.message === 'Google OAuth not configured') {
        return res.status(501).json({
          success: false,
          error: 'Google OAuth not configured'
        });
      }

      next(error);
    }
  }

  async googleCallback(req, res, next) {
    try {
      const result = await authService.loginWithGoogle(req.body, req);

      // Set HTTP-only cookies
      this._setCookies(res, result.accessToken, result.refreshToken);

      res.status(200).json({
        success: true,
        data: {
          user: result.user
        }
      });
    } catch (error) {
      logger.error({ err: error }, 'Google OAuth callback failed');

      if (error.message.includes('Google') || error.message.includes('OAuth') || error.message.includes('Invalid Google authorization code')) {
        return res.status(400).json({
          success: false,
          error: 'Invalid Google authorization code'
        });
      }

      next(error);
    }
  }

  async googleIdToken(req, res, next) {
    try {
      const result = await authService.loginWithGoogleIdToken(req.body, req);

      // Set HTTP-only cookies
      this._setCookies(res, result.accessToken, result.refreshToken);

      res.status(200).json({
        success: true,
        data: {
          user: result.user
        }
      });
    } catch (error) {
      logger.error({ err: error }, 'Google ID token login failed');

      if (error.message.includes('Google') || error.message.includes('Invalid Google ID token')) {
        return res.status(400).json({
          success: false,
          error: 'Invalid Google ID token'
        });
      }

      next(error);
    }
  }

  async refresh(req, res, next) {
    try {
      const result = await authService.refresh(req.cookies, req);

      // Set new HTTP-only cookies
      this._setCookies(res, result.accessToken, result.refreshToken);

      res.status(200).json({
        success: true,
        data: {
          user: result.user
        }
      });
    } catch (error) {
      logger.error({ err: error }, 'Token refresh failed');

      if (error.message === 'Invalid or expired refresh token') {
        return res.status(401).json({
          success: false,
          error: 'Invalid or expired refresh token'
        });
      }

      next(error);
    }
  }

  async logout(req, res, next) {
    try {
      await authService.logout(req);

      // Clear cookies
      this._clearCookies(res);

      res.status(204).send();
    } catch (error) {
      logger.error({ err: error }, 'Logout failed');

      if (error.message === 'No active session found') {
        return res.status(400).json({
          success: false,
          error: 'No active session found'
        });
      }

      next(error);
    }
  }

  async logoutAll(req, res, next) {
    try {
      await authService.logoutAll(req);

      // Clear cookies
      this._clearCookies(res);

      res.status(204).send();
    } catch (error) {
      logger.error({ err: error }, 'Logout all failed');

      if (error.message === 'User not authenticated') {
        return res.status(401).json({
          success: false,
          error: 'User not authenticated'
        });
      }

      next(error);
    }
  }

  async me(req, res, next) {
    try {
      const result = await authService.me(req);

      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error({ err: error }, 'Get current user failed');

      if (error.message === 'User not authenticated' || error.message === 'User not found') {
        return res.status(401).json({
          success: false,
          error: 'User not authenticated'
        });
      }

      next(error);
    }
  }
}

const authController = new AuthController();

module.exports = {
  register: [validate(schemas.register), authController.register.bind(authController)],
  login: [validate(schemas.login), authController.login.bind(authController)],
  googleStart: authController.googleStart.bind(authController),
  googleCallback: [validate(schemas.googleCallback), authController.googleCallback.bind(authController)],
  googleIdToken: [validate(schemas.googleIdToken), authController.googleIdToken.bind(authController)],
  refresh: [validate(schemas.refreshToken), authController.refresh.bind(authController)],
  logout: authController.logout.bind(authController),
  logoutAll: authController.logoutAll.bind(authController),
  me: authController.me.bind(authController),
  getToken: authController.getToken.bind(authController)
};
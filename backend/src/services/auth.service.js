const { user: userRepo, oauth: oauthRepo, session: sessionRepo } = require('@repositories/auth.repository');
const { hashPassword, verifyPassword, generateSecureToken, hashToken, normalizeEmail } = require('@utils/crypto');
const { signAccessToken, getRefreshTokenExpiry } = require('@utils/jwt/jwt');
const { generateGoogleAuthUrl, verifyGoogleToken, verifyGoogleIdToken, isConfigured: isGoogleConfigured } = require('@utils/google-oauth');
const logger = require('@utils/logger').child({ module: 'authService' });

class AuthService {
  async register({ email, password, displayName }, context) {
    try {
      const normalizedEmail = normalizeEmail(email);

      const existingUser = await userRepo.findByEmail(normalizedEmail);
      if (existingUser) {
        throw new Error('User with this email already exists');
      }

      const passwordHash = await hashPassword(password);
      const user = await userRepo.create({
        email: normalizedEmail,
        displayName,
        passwordHash,
        avatarUrl: null
      });

      const { accessToken, refreshToken } = await this._createTokens(user, context);

      logger.info({ userId: user.id }, 'User registered successfully');

      return {
        user: this._sanitizeUser(user),
        accessToken,
        refreshToken
      };
    } catch (error) {
      logger.error({ err: error, email }, 'User registration failed');
      throw error;
    }
  }

  async login({ email, password }, context) {
    try {
      const normalizedEmail = normalizeEmail(email);
      const user = await userRepo.findByEmail(normalizedEmail);

      if (!user || !user.password_hash) {
        throw new Error('Invalid email or password');
      }

      const isValidPassword = await verifyPassword(password, user.password_hash);
      if (!isValidPassword) {
        throw new Error('Invalid email or password');
      }

      const { accessToken, refreshToken } = await this._createTokens(user, context);

      logger.info({ userId: user.id }, 'User logged in successfully');

      return {
        user: this._sanitizeUser(user),
        accessToken,
        refreshToken
      };
    } catch (error) {
      logger.error({ err: error, email }, 'User login failed');
      throw error;
    }
  }

  async googleStart() {
    try {
      if (!isGoogleConfigured) {
        throw new Error('Google OAuth not configured');
      }

      const url = generateGoogleAuthUrl();
      return { url };
    } catch (error) {
      logger.error({ err: error }, 'Google OAuth start failed');
      throw error;
    }
  }

  async loginWithGoogle({ code, redirectUri }, context) {
    try {
      if (!isGoogleConfigured) {
        throw new Error('Google OAuth not configured');
      }

      const googleProfile = await verifyGoogleToken(code, redirectUri);

      if (!googleProfile.emailVerified) {
        throw new Error('Google email not verified');
      }

      const normalizedEmail = normalizeEmail(googleProfile.email);

      let user;
      let isNewUser = false;

      const existingOAuth = await oauthRepo.findByProviderId('google', googleProfile.sub);
      if (existingOAuth) {
        user = existingOAuth;
        logger.info({ userId: user.id }, 'Existing Google user logged in');
      } else {
        const existingUser = await userRepo.findByEmail(normalizedEmail);
        if (existingUser) {
          await oauthRepo.create({
            userId: existingUser.id,
            provider: 'google',
            providerUserId: googleProfile.sub
          });
          user = existingUser;
          logger.info({ userId: user.id }, 'Google account linked to existing user');
        } else {
          user = await userRepo.create({
            email: normalizedEmail,
            displayName: googleProfile.name,
            passwordHash: null,
            avatarUrl: googleProfile.picture
          });

          await oauthRepo.create({
            userId: user.id,
            provider: 'google',
            providerUserId: googleProfile.sub
          });

          isNewUser = true;
          logger.info({ userId: user.id }, 'New user created via Google OAuth');
        }
      }

      const { accessToken, refreshToken } = await this._createTokens(user, context);

      return {
        user: this._sanitizeUser(user),
        accessToken,
        refreshToken,
        isNewUser
      };
    } catch (error) {
      logger.error({ err: error }, 'Google OAuth login failed');
      throw error;
    }
  }

  async loginWithGoogleIdToken({ idToken }, context) {
    try {
      if (!isGoogleConfigured) {
        throw new Error('Google OAuth not configured');
      }

      const googleProfile = await verifyGoogleIdToken(idToken);

      if (!googleProfile.emailVerified) {
        throw new Error('Google email not verified');
      }

      const normalizedEmail = normalizeEmail(googleProfile.email);

      let user;
      let isNewUser = false;

      const existingOAuth = await oauthRepo.findByProviderId('google', googleProfile.sub);
      if (existingOAuth) {
        user = existingOAuth;
        logger.info({ userId: user.id }, 'Existing Google user logged in via ID token');
      } else {
        const existingUser = await userRepo.findByEmail(normalizedEmail);
        if (existingUser) {
          await oauthRepo.create({
            userId: existingUser.id,
            provider: 'google',
            providerUserId: googleProfile.sub
          });
          user = existingUser;
          logger.info({ userId: user.id }, 'Google account linked to existing user via ID token');
        } else {
          user = await userRepo.create({
            email: normalizedEmail,
            displayName: googleProfile.name,
            passwordHash: null,
            avatarUrl: googleProfile.picture
          });

          await oauthRepo.create({
            userId: user.id,
            provider: 'google',
            providerUserId: googleProfile.sub
          });

          isNewUser = true;
          logger.info({ userId: user.id }, 'New user created via Google ID token');
        }
      }

      const { accessToken, refreshToken } = await this._createTokens(user, context);

      return {
        user: this._sanitizeUser(user),
        accessToken,
        refreshToken,
        isNewUser
      };
    } catch (error) {
      logger.error({ err: error }, 'Google ID token login failed');
      throw error;
    }
  }

  async refresh(cookies, context) {
    const refreshToken = cookies?.refreshToken;

    if (!refreshToken) {
      throw new Error('Invalid or expired refresh token');
    }

    try {
      const refreshTokenHash = hashToken(refreshToken);
      const session = await sessionRepo.findValidByHash(refreshTokenHash);

      if (!session) {
        throw new Error('Invalid or expired refresh token');
      }

      const newRefreshToken = generateSecureToken();
      const newRefreshTokenHash = hashToken(newRefreshToken);
      const newExpiresAt = getRefreshTokenExpiry();

      await sessionRepo.rotate(session.id, newRefreshTokenHash, newExpiresAt);

      const user = {
        id: session.user_id,
        email: session.email,
        display_name: session.display_name,
        avatar_url: session.avatar_url,
        is_active: session.is_active
      };

      const accessToken = signAccessToken(user, session.id);

      logger.info({ userId: user.id, sessionId: session.id }, 'Tokens refreshed successfully');

      return {
        user: this._sanitizeUser(user),
        accessToken,
        refreshToken: newRefreshToken
      };
    } catch (error) {
      logger.error({ err: error }, 'Token refresh failed');
      throw error;
    }
  }

  async logout(context) {
    try {
      const sessionId = context.user?.sessionId;
      if (!sessionId) {
        throw new Error('No active session found');
      }

      await sessionRepo.revoke(sessionId);

      logger.info({ sessionId }, 'User logged out successfully');
    } catch (error) {
      logger.error({ err: error }, 'Logout failed');
      throw error;
    }
  }

  async logoutAll(context) {
    try {
      const userId = context.user?.id;
      if (!userId) {
        throw new Error('User not authenticated');
      }

      await sessionRepo.revokeAll(userId);

      logger.info({ userId }, 'All user sessions revoked successfully');
    } catch (error) {
      logger.error({ err: error }, 'Logout all failed');
      throw error;
    }
  }

  async me(context) {
    try {
      const userId = context.user?.id;
      if (!userId) {
        throw new Error('User not authenticated');
      }

      const user = await userRepo.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      return this._sanitizeUser(user);
    } catch (error) {
      logger.error({ err: error }, 'Get current user failed');
      throw error;
    }
  }

  async _createTokens(user, context) {
    const refreshToken = generateSecureToken();
    const refreshTokenHash = hashToken(refreshToken);
    const expiresAt = getRefreshTokenExpiry();

    const session = await sessionRepo.create({
      userId: user.id,
      refreshTokenHash,
      userAgent: context.get?.('User-Agent') || context.headers?.['user-agent'],
      ipAddress: context.ip || context.connection?.remoteAddress,
      expiresAt
    });

    const accessToken = signAccessToken(user, session.id);

    return { accessToken, refreshToken };
  }

  _sanitizeUser(user) {
    const { password_hash, ...sanitized } = user;
    return sanitized;
  }
}

module.exports = new AuthService();
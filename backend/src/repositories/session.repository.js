const pool = require('@/database/config');
const logger = require('@utils/logger').child({ module: 'sessionRepository' });

class SessionRepository {
  async create({ userId, refreshTokenHash, userAgent, ipAddress, expiresAt }) {
    try {
      const query = `
        INSERT INTO user_sessions (user_id, refresh_token_hash, user_agent, ip_address, expires_at)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `;
      const values = [userId, refreshTokenHash, userAgent, ipAddress, expiresAt];
      const result = await pool.query(query, values);

      logger.info({
        sessionId: result.rows[0].id,
        userId
      }, 'User session created successfully');
      return result.rows[0];
    } catch (error) {
      logger.error({ err: error, userId }, 'Failed to create user session');
      throw error;
    }
  }

  async findValidByHash(refreshTokenHash) {
    try {
      const query = `
        SELECT s.*, u.id as user_id, u.email, u.display_name, u.avatar_url, u.is_active
        FROM user_sessions s
        JOIN users u ON s.user_id = u.id
        WHERE s.refresh_token_hash = $1
          AND s.expires_at > NOW()
          AND s.revoked_at IS NULL
          AND u.is_active = true
      `;
      const result = await pool.query(query, [refreshTokenHash]);
      return result.rows[0] || null;
    } catch (error) {
      logger.error({ err: error }, 'Failed to find valid session by hash');
      throw error;
    }
  }

  async findById(sessionId) {
    try {
      const query = 'SELECT * FROM user_sessions WHERE id = $1';
      const result = await pool.query(query, [sessionId]);
      return result.rows[0] || null;
    } catch (error) {
      logger.error({ err: error, sessionId }, 'Failed to find session by ID');
      throw error;
    }
  }

  async rotate(sessionId, newRefreshTokenHash, newExpiresAt) {
    try {
      const query = `
        UPDATE user_sessions
        SET refresh_token_hash = $1, expires_at = $2, updated_at = NOW()
        WHERE id = $3 AND expires_at > NOW() AND revoked_at IS NULL
        RETURNING *
      `;
      const result = await pool.query(query, [newRefreshTokenHash, newExpiresAt, sessionId]);

      if (result.rows.length === 0) {
        throw new Error('Session not found, expired, or already revoked');
      }

      logger.info({ sessionId }, 'Session rotated successfully');
      return result.rows[0];
    } catch (error) {
      logger.error({ err: error, sessionId }, 'Failed to rotate session');
      throw error;
    }
  }

  async revoke(sessionId) {
    try {
      const query = `
        UPDATE user_sessions
        SET revoked_at = NOW(), updated_at = NOW()
        WHERE id = $1 AND revoked_at IS NULL
        RETURNING *
      `;
      const result = await pool.query(query, [sessionId]);

      if (result.rows.length === 0) {
        throw new Error('Session not found or already revoked');
      }

      logger.info({ sessionId }, 'Session revoked successfully');
      return result.rows[0];
    } catch (error) {
      logger.error({ err: error, sessionId }, 'Failed to revoke session');
      throw error;
    }
  }

  async revokeAll(userId) {
    try {
      const query = `
        UPDATE user_sessions
        SET revoked_at = NOW(), updated_at = NOW()
        WHERE user_id = $1 AND revoked_at IS NULL
        RETURNING *
      `;
      const result = await pool.query(query, [userId]);

      logger.info({
        userId,
        revokedCount: result.rows.length
      }, 'All user sessions revoked successfully');
      return result.rows;
    } catch (error) {
      logger.error({ err: error, userId }, 'Failed to revoke all user sessions');
      throw error;
    }
  }

  async revokeByHash(refreshTokenHash) {
    try {
      const query = `
        UPDATE user_sessions
        SET revoked_at = NOW(), updated_at = NOW()
        WHERE refresh_token_hash = $1 AND revoked_at IS NULL
        RETURNING *
      `;
      const result = await pool.query(query, [refreshTokenHash]);

      if (result.rows.length === 0) {
        throw new Error('Session not found or already revoked');
      }

      logger.info({ sessionId: result.rows[0].id }, 'Session revoked by hash successfully');
      return result.rows[0];
    } catch (error) {
      logger.error({ err: error }, 'Failed to revoke session by hash');
      throw error;
    }
  }

  async cleanupExpired() {
    try {
      const query = `
        DELETE FROM user_sessions
        WHERE expires_at <= NOW() - INTERVAL '7 days'
      `;
      const result = await pool.query(query);

      logger.info({
        deletedCount: result.rowCount
      }, 'Expired sessions cleaned up successfully');
      return result.rowCount;
    } catch (error) {
      logger.error({ err: error }, 'Failed to cleanup expired sessions');
      throw error;
    }
  }

  async findActiveByUser(userId, limit = 10) {
    try {
      const query = `
        SELECT id, user_agent, ip_address, created_at, expires_at
        FROM user_sessions
        WHERE user_id = $1 AND expires_at > NOW() AND revoked_at IS NULL
        ORDER BY created_at DESC
        LIMIT $2
      `;
      const result = await pool.query(query, [userId, limit]);
      return result.rows;
    } catch (error) {
      logger.error({ err: error, userId }, 'Failed to find active sessions for user');
      throw error;
    }
  }
}

module.exports = new SessionRepository();
const logger = require('@utils/logger').child({ module: 'userRepository' });

class UserRepository {
  constructor(pool) {
    this.pool = pool;
  }

  async findByEmail(email) {
    try {
      const query = 'SELECT * FROM users WHERE email = $1 AND is_active = true';
      const result = await this.pool.query(query, [email.toLowerCase()]);
      return result.rows[0] || null;
    } catch (error) {
      logger.error({ err: error, email }, 'Failed to find user by email');
      throw error;
    }
  }

  async findById(id) {
    try {
      const query = 'SELECT * FROM users WHERE id = $1 AND is_active = true';
      const result = await this.pool.query(query, [id]);
      return result.rows[0] || null;
    } catch (error) {
      logger.error({ err: error, id }, 'Failed to find user by id');
      throw error;
    }
  }

  async create({ email, displayName, passwordHash, avatarUrl }) {
    try {
      const query = `
        INSERT INTO users (email, display_name, password_hash, avatar_url)
        VALUES ($1, $2, $3, $4)
        RETURNING *
      `;
      const values = [email.toLowerCase(), displayName, passwordHash, avatarUrl];
      const result = await this.pool.query(query, values);

      logger.info({ userId: result.rows[0].id }, 'User created successfully');
      return result.rows[0];
    } catch (error) {
      logger.error({ err: error, email }, 'Failed to create user');
      throw error;
    }
  }

  async updatePassword(userId, passwordHash) {
    try {
      const query = `
        UPDATE users
        SET password_hash = $1, updated_at = NOW()
        WHERE id = $2 AND is_active = true
        RETURNING *
      `;
      const result = await this.pool.query(query, [passwordHash, userId]);

      if (result.rows.length === 0) {
        throw new Error('User not found or inactive');
      }

      logger.info({ userId }, 'User password updated successfully');
      return result.rows[0];
    } catch (error) {
      logger.error({ err: error, userId }, 'Failed to update user password');
      throw error;
    }
  }

  async update(userId, updates) {
    try {
      const allowedFields = ['display_name', 'avatar_url'];
      const fields = Object.keys(updates).filter(field => allowedFields.includes(field));

      if (fields.length === 0) {
        throw new Error('No valid fields to update');
      }

      const setClause = fields.map((field, index) => `${field} = $${index + 2}`).join(', ');
      const query = `
        UPDATE users
        SET ${setClause}, updated_at = NOW()
        WHERE id = $1 AND is_active = true
        RETURNING *
      `;

      const values = [userId, ...fields.map(field => updates[field])];
      const result = await this.pool.query(query, values);

      if (result.rows.length === 0) {
        throw new Error('User not found or inactive');
      }

      logger.info({ userId }, 'User updated successfully');
      return result.rows[0];
    } catch (error) {
      logger.error({ err: error, userId }, 'Failed to update user');
      throw error;
    }
  }

  async deactivate(userId) {
    try {
      const query = `
        UPDATE users
        SET is_active = false, updated_at = NOW()
        WHERE id = $1
        RETURNING *
      `;
      const result = await this.pool.query(query, [userId]);

      if (result.rows.length === 0) {
        throw new Error('User not found');
      }

      logger.info({ userId }, 'User deactivated successfully');
      return result.rows[0];
    } catch (error) {
      logger.error({ err: error, userId }, 'Failed to deactivate user');
      throw error;
    }
  }

  async getAllUsers(currentUserId, limit = 20) {
    try {
      logger.info({currentUserId, limit}, "Zde");
      const query = `
        SELECT id, email, display_name, avatar_url
        FROM users
        WHERE is_active = true
        AND id != $1
        ORDER BY display_name
        LIMIT $2
      `;

      const result = await this.pool.query(query, [currentUserId, limit]);

      return result.rows.map(row => ({
        id: row.id,
        email: row.email,
        display_name: row.display_name,
        avatar_url: row.avatar_url
      }));
    } catch (error) {
      logger.error({ error: error.message, currentUserId }, 'Error getting all users');
      throw error;
    }
  }

  async searchUsers(query, currentUserId, limit = 20) {
    try {
      const searchQuery = `
        SELECT id, email, display_name, avatar_url
        FROM users
        WHERE is_active = true
        AND id != $2
        AND (
          display_name ILIKE $1
          OR email ILIKE $1
        )
        ORDER BY display_name
        LIMIT $3
      `;
      const searchTerm = `%${query}%`;
      const result = await this.pool.query(searchQuery, [searchTerm, currentUserId, limit]);

      logger.debug({ query, currentUserId, resultCount: result.rows.length }, 'User search completed');

      return result.rows.map(row => ({
        id: row.id,
        email: row.email,
        display_name: row.display_name,
        avatar_url: row.avatar_url
      }));
    } catch (error) {
      logger.error({ err: error, query, currentUserId }, 'Failed to search users');
      throw error;
    }
  }

  async updateUserPresence(userId, status) {
    try {
      const result = await this.pool.query(
        `INSERT INTO user_presence (user_id, status, last_seen, updated_at)
         VALUES ($1, $2, NOW(), NOW())
         ON CONFLICT (user_id) DO UPDATE SET
         status = $2, last_seen = NOW(), updated_at = NOW()
         RETURNING *`,
        [userId, status]
      );

      return result.rows[0];
    } catch (error) {
      logger.error({ err: error, userId, status }, 'Failed to update user presence');
      throw error;
    }
  }

  async getUserPresence(userIds) {
    try {
      if (!userIds.length) return [];

      const result = await this.pool.query(
        'SELECT user_id, status, last_seen FROM user_presence WHERE user_id = ANY($1)',
        [userIds]
      );

      return result.rows;
    } catch (error) {
      logger.error({ err: error, userIds }, 'Failed to get user presence');
      throw error;
    }
  }
}

module.exports = UserRepository;
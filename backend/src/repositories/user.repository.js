const pool = require('@/database/config');
const logger = require('@utils/logger').child({ module: 'userRepository' });

class UserRepository {
  async findByEmail(email) {
    try {
      const query = 'SELECT * FROM users WHERE email = $1 AND is_active = true';
      const result = await pool.query(query, [email.toLowerCase()]);
      return result.rows[0] || null;
    } catch (error) {
      logger.error({ err: error, email }, 'Failed to find user by email');
      throw error;
    }
  }

  async findById(id) {
    try {
      const query = 'SELECT * FROM users WHERE id = $1 AND is_active = true';
      const result = await pool.query(query, [id]);
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
      const result = await pool.query(query, values);

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
      const result = await pool.query(query, [passwordHash, userId]);

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
      const result = await pool.query(query, values);

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
      const result = await pool.query(query, [userId]);

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
}

module.exports = new UserRepository();
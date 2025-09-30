class OAuthRepository {
  constructor(pool, logger) {
    this.pool = pool;
    this.logger = logger || require('@utils/logger').child({ module: 'oauthRepository' });
  }

  async findByProviderId(provider, providerUserId) {
    try {
      const query = `
        SELECT oa.*, u.*
        FROM oauth_accounts oa
        JOIN users u ON oa.user_id = u.id
        WHERE oa.provider = $1 AND oa.provider_user_id = $2 AND u.is_active = true
      `;
      const result = await this.pool.query(query, [provider, providerUserId]);
      return result.rows[0] || null;
    } catch (error) {
      this.logger.error({ err: error, provider, providerUserId }, 'Failed to find OAuth account by provider ID');
      throw error;
    }
  }

  async findByUserId(userId, provider = null) {
    try {
      let query = 'SELECT * FROM oauth_accounts WHERE user_id = $1';
      const params = [userId];

      if (provider) {
        query += ' AND provider = $2';
        params.push(provider);
      }

      const result = await this.pool.query(query, params);
      return result.rows;
    } catch (error) {
      this.logger.error({ err: error, userId, provider }, 'Failed to find OAuth accounts by user ID');
      throw error;
    }
  }

  async create({ userId, provider, providerUserId }) {
    try {
      const query = `
        INSERT INTO oauth_accounts (user_id, provider, provider_user_id)
        VALUES ($1, $2, $3)
        RETURNING *
      `;
      const values = [userId, provider, providerUserId];
      const result = await this.pool.query(query, values);

      this.logger.info({
        oauthAccountId: result.rows[0].id,
        userId,
        provider
      }, 'OAuth account created successfully');
      return result.rows[0];
    } catch (error) {
      this.logger.error({ err: error, userId, provider }, 'Failed to create OAuth account');
      throw error;
    }
  }

  async delete(id) {
    try {
      const query = 'DELETE FROM oauth_accounts WHERE id = $1 RETURNING *';
      const result = await this.pool.query(query, [id]);

      if (result.rows.length === 0) {
        throw new Error('OAuth account not found');
      }

      this.logger.info({ oauthAccountId: id }, 'OAuth account deleted successfully');
      return result.rows[0];
    } catch (error) {
      this.logger.error({ err: error, id }, 'Failed to delete OAuth account');
      throw error;
    }
  }

  async deleteByUserIdAndProvider(userId, provider) {
    try {
      const query = 'DELETE FROM oauth_accounts WHERE user_id = $1 AND provider = $2 RETURNING *';
      const result = await this.pool.query(query, [userId, provider]);

      this.logger.info({
        userId,
        provider,
        deletedCount: result.rows.length
      }, 'OAuth accounts deleted successfully');
      return result.rows;
    } catch (error) {
      this.logger.error({ err: error, userId, provider }, 'Failed to delete OAuth accounts');
      throw error;
    }
  }
}

module.exports = OAuthRepository;
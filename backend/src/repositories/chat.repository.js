const pool = require('@/database/config');
const logger = require('@utils/logger');

class ChatRepository {
  // Conversations
  async createConversation({ type, name, avatarUrl, createdBy, participants = [] }) {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Create conversation
      const conversationResult = await client.query(
        `INSERT INTO conversations (type, name, avatar_url, created_by)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [type, name, avatarUrl, createdBy]
      );

      const conversation = conversationResult.rows[0];

      // Add creator as admin participant
      await client.query(
        `INSERT INTO conversation_participants (conversation_id, user_id, is_admin)
         VALUES ($1, $2, true)`,
        [conversation.id, createdBy]
      );

      // Add other participants
      for (const participantId of participants) {
        if (participantId !== createdBy) {
          await client.query(
            `INSERT INTO conversation_participants (conversation_id, user_id)
             VALUES ($1, $2)`,
            [conversation.id, participantId]
          );
        }
      }

      await client.query('COMMIT');
      return conversation;
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error({ error: error.message }, 'Error creating conversation');
      throw error;
    } finally {
      client.release();
    }
  }

  async getConversationsForUser(userId) {
    const result = await pool.query(`
      SELECT
        c.*,
        COALESCE(
          json_agg(
            CASE WHEN cp.user_id IS NOT NULL THEN
              json_build_object(
                'id', u.id,
                'email', u.email,
                'display_name', u.display_name,
                'avatar_url', u.avatar_url,
                'is_admin', cp.is_admin,
                'joined_at', cp.joined_at,
                'status', COALESCE(up.status, 'offline'),
                'last_seen', up.last_seen
              )
            END
          ) FILTER (WHERE cp.user_id IS NOT NULL),
          '[]'::json
        ) as participants,
        (
          SELECT json_build_object(
            'id', m.id,
            'content', m.content,
            'message_type', m.message_type,
            'created_at', m.created_at,
            'sender_id', m.sender_id,
            'sender_name', sender.display_name
          )
          FROM messages m
          JOIN users sender ON m.sender_id = sender.id
          WHERE m.conversation_id = c.id
          ORDER BY m.created_at DESC
          LIMIT 1
        ) as last_message,
        (
          SELECT COUNT(*)::int
          FROM messages m
          LEFT JOIN message_read_status mrs ON m.id = mrs.message_id AND mrs.user_id = $1
          WHERE m.conversation_id = c.id
          AND m.sender_id != $1
          AND mrs.id IS NULL
        ) as unread_count
      FROM conversations c
      JOIN conversation_participants my_cp ON c.id = my_cp.conversation_id AND my_cp.user_id = $1 AND my_cp.left_at IS NULL
      LEFT JOIN conversation_participants cp ON c.id = cp.conversation_id AND cp.left_at IS NULL
      LEFT JOIN users u ON cp.user_id = u.id
      LEFT JOIN user_presence up ON u.id = up.user_id
      GROUP BY c.id, c.type, c.name, c.avatar_url, c.created_by, c.created_at, c.updated_at
      ORDER BY c.updated_at DESC
    `, [userId]);

    return result.rows;
  }

  async getConversationById(conversationId, userId) {
    logger.debug({ conversationId, userId }, 'Repository: Querying conversation by ID');

    const result = await pool.query(`
      SELECT
        c.*,
        json_agg(
          json_build_object(
            'id', u.id,
            'email', u.email,
            'display_name', u.display_name,
            'avatar_url', u.avatar_url,
            'is_admin', cp.is_admin,
            'joined_at', cp.joined_at,
            'status', COALESCE(up2.status, 'offline'),
            'last_seen', up2.last_seen
          )
        ) as participants
      FROM conversations c
      JOIN conversation_participants my_cp ON c.id = my_cp.conversation_id AND my_cp.user_id = $2 AND my_cp.left_at IS NULL
      JOIN conversation_participants cp ON c.id = cp.conversation_id AND cp.left_at IS NULL
      JOIN users u ON cp.user_id = u.id
      LEFT JOIN user_presence up2 ON u.id = up2.user_id
      WHERE c.id = $1
      GROUP BY c.id
    `, [conversationId, userId]);

    logger.debug({ conversationId, userId, rowCount: result.rows.length }, 'Repository: Query result');

    if (result.rows.length === 0) {
      // Let's also check if the conversation exists at all and if the user is a participant separately
      const convExists = await pool.query('SELECT id FROM conversations WHERE id = $1', [conversationId]);
      const isParticipant = await pool.query('SELECT 1 FROM conversation_participants WHERE conversation_id = $1 AND user_id = $2 AND left_at IS NULL', [conversationId, userId]);

      logger.debug({
        conversationId,
        userId,
        conversationExists: convExists.rows.length > 0,
        isParticipant: isParticipant.rows.length > 0
      }, 'Repository: Detailed check');
    }

    return result.rows[0];
  }

  async findDirectConversation(userId1, userId2) {
    const result = await pool.query(`
      SELECT c.id
      FROM conversations c
      JOIN conversation_participants cp1 ON c.id = cp1.conversation_id AND cp1.user_id = $1 AND cp1.left_at IS NULL
      JOIN conversation_participants cp2 ON c.id = cp2.conversation_id AND cp2.user_id = $2 AND cp2.left_at IS NULL
      WHERE c.type = 'dm'
      AND (
        SELECT COUNT(*) FROM conversation_participants cp
        WHERE cp.conversation_id = c.id AND cp.left_at IS NULL
      ) = 2
    `, [userId1, userId2]);

    return result.rows[0];
  }

  // Messages
  async createMessage({ conversationId, senderId, content, messageType = 'text', replyTo = null }) {
    const result = await pool.query(
      `INSERT INTO messages (conversation_id, sender_id, content, message_type, reply_to)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [conversationId, senderId, content, messageType, replyTo]
    );

    return result.rows[0];
  }

  async getMessagesForConversation(conversationId, userId, limit = 50, offset = 0) {
    // First verify user is participant
    const participantCheck = await pool.query(
      'SELECT 1 FROM conversation_participants WHERE conversation_id = $1 AND user_id = $2 AND left_at IS NULL',
      [conversationId, userId]
    );

    if (participantCheck.rows.length === 0) {
      throw new Error('User is not a participant in this conversation');
    }

    const result = await pool.query(`
      SELECT
        m.*,
        sender.display_name as sender_name,
        sender.avatar_url as sender_avatar,
        reply_msg.content as reply_to_content,
        reply_sender.display_name as reply_sender_name,
        COALESCE(
          json_agg(
            CASE WHEN mr.id IS NOT NULL THEN
              json_build_object('emoji', mr.emoji, 'user_id', mr.user_id)
            END
          ) FILTER (WHERE mr.id IS NOT NULL),
          '[]'::json
        ) as reactions,
        CASE WHEN mrs.id IS NOT NULL THEN true ELSE false END as is_read_by_user
      FROM messages m
      JOIN users sender ON m.sender_id = sender.id
      LEFT JOIN messages reply_msg ON m.reply_to = reply_msg.id
      LEFT JOIN users reply_sender ON reply_msg.sender_id = reply_sender.id
      LEFT JOIN message_reactions mr ON m.id = mr.message_id
      LEFT JOIN message_read_status mrs ON m.id = mrs.message_id AND mrs.user_id = $2
      WHERE m.conversation_id = $1
      GROUP BY m.id, sender.display_name, sender.avatar_url, reply_msg.content, reply_sender.display_name, mrs.id
      ORDER BY m.created_at DESC
      LIMIT $3 OFFSET $4
    `, [conversationId, userId, limit, offset]);

    return result.rows.reverse(); // Return in chronological order
  }

  async updateMessage(messageId, userId, content) {
    const result = await pool.query(
      `UPDATE messages
       SET content = $3, is_edited = true, edited_at = NOW()
       WHERE id = $1 AND sender_id = $2
       RETURNING *`,
      [messageId, userId, content]
    );

    return result.rows[0];
  }

  async deleteMessage(messageId, userId) {
    const result = await pool.query(
      'DELETE FROM messages WHERE id = $1 AND sender_id = $2 RETURNING *',
      [messageId, userId]
    );

    return result.rows[0];
  }

  // Message reactions
  async addReaction(messageId, userId, emoji) {
    try {
      const result = await pool.query(
        `INSERT INTO message_reactions (message_id, user_id, emoji)
         VALUES ($1, $2, $3)
         ON CONFLICT (message_id, user_id, emoji) DO NOTHING
         RETURNING *`,
        [messageId, userId, emoji]
      );

      return result.rows[0];
    } catch (error) {
      if (error.code === '23505') { // Unique violation
        return null; // Reaction already exists
      }
      throw error;
    }
  }

  async removeReaction(messageId, userId, emoji) {
    const result = await pool.query(
      'DELETE FROM message_reactions WHERE message_id = $1 AND user_id = $2 AND emoji = $3 RETURNING *',
      [messageId, userId, emoji]
    );

    return result.rows[0];
  }

  // Message read status
  async markMessageAsRead(messageId, userId) {
    try {
      const result = await pool.query(
        `INSERT INTO message_read_status (message_id, user_id)
         VALUES ($1, $2)
         ON CONFLICT (message_id, user_id) DO NOTHING
         RETURNING *`,
        [messageId, userId]
      );

      return result.rows[0];
    } catch (error) {
      if (error.code === '23505') { // Unique violation
        return null; // Already marked as read
      }
      throw error;
    }
  }

  async markConversationAsRead(conversationId, userId) {
    await pool.query(`
      INSERT INTO message_read_status (message_id, user_id)
      SELECT m.id, $2
      FROM messages m
      LEFT JOIN message_read_status mrs ON m.id = mrs.message_id AND mrs.user_id = $2
      WHERE m.conversation_id = $1 AND m.sender_id != $2 AND mrs.id IS NULL
      ON CONFLICT (message_id, user_id) DO NOTHING
    `, [conversationId, userId]);
  }

  // User presence
  async updateUserPresence(userId, status) {
    const result = await pool.query(
      `INSERT INTO user_presence (user_id, status, last_seen, updated_at)
       VALUES ($1, $2, NOW(), NOW())
       ON CONFLICT (user_id) DO UPDATE SET
       status = $2, last_seen = NOW(), updated_at = NOW()
       RETURNING *`,
      [userId, status]
    );

    return result.rows[0];
  }

  async getUserPresence(userIds) {
    if (!userIds.length) return [];

    const result = await pool.query(
      'SELECT user_id, status, last_seen FROM user_presence WHERE user_id = ANY($1)',
      [userIds]
    );

    return result.rows;
  }

  // Typing indicators
  async setTypingIndicator(conversationId, userId) {
    await pool.query(
      `INSERT INTO typing_indicators (conversation_id, user_id)
       VALUES ($1, $2)
       ON CONFLICT (conversation_id, user_id) DO UPDATE SET created_at = NOW()`,
      [conversationId, userId]
    );
  }

  async removeTypingIndicator(conversationId, userId) {
    await pool.query(
      'DELETE FROM typing_indicators WHERE conversation_id = $1 AND user_id = $2',
      [conversationId, userId]
    );
  }

  async getTypingUsers(conversationId) {
    // Clean up old typing indicators (older than 10 seconds)
    await pool.query(
      'DELETE FROM typing_indicators WHERE created_at < NOW() - INTERVAL \'10 seconds\''
    );

    const result = await pool.query(
      'SELECT user_id FROM typing_indicators WHERE conversation_id = $1',
      [conversationId]
    );

    return result.rows.map(row => row.user_id);
  }

  // Draft messages
  async saveDraft(conversationId, userId, content) {
    const result = await pool.query(
      `INSERT INTO message_drafts (conversation_id, user_id, content)
       VALUES ($1, $2, $3)
       ON CONFLICT (conversation_id, user_id) DO UPDATE SET
       content = $3, updated_at = NOW()
       RETURNING *`,
      [conversationId, userId, content]
    );

    return result.rows[0];
  }

  async getDraft(conversationId, userId) {
    const result = await pool.query(
      'SELECT content FROM message_drafts WHERE conversation_id = $1 AND user_id = $2',
      [conversationId, userId]
    );

    return result.rows[0]?.content || '';
  }

  async deleteDraft(conversationId, userId) {
    await pool.query(
      'DELETE FROM message_drafts WHERE conversation_id = $1 AND user_id = $2',
      [conversationId, userId]
    );
  }
}

module.exports = new ChatRepository();
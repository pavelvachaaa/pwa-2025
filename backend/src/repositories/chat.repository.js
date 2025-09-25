const pool = require('@/database/config');
const logger = require('@utils/logger');

class ChatRepository {
  // Conversations
  async createConversation({ userAId, userBId, createdBy, avatarUrl = null }) {
    const result = await pool.query(
      `INSERT INTO conversations (user_a_id, user_b_id, created_by, avatar_url)
       VALUES ($1::uuid, $2::uuid, $3::uuid, $4)
       RETURNING *`,
      [userAId, userBId, createdBy, avatarUrl]
    );

    return result.rows[0];
  }

  async getConversationsForUser(userId) {
    const result = await pool.query(`
      SELECT
        c.*,
        -- Get the other participant info (not the current user)
        json_build_object(
          'id', other_user.id,
          'email', other_user.email,
          'display_name', other_user.display_name,
          'avatar_url', other_user.avatar_url,
          'status', COALESCE(up.status, 'offline'),
          'last_seen', up.last_seen
        ) as other_participant,
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
          LEFT JOIN message_read_status mrs ON m.id = mrs.message_id AND mrs.user_id = $1::uuid
          WHERE m.conversation_id = c.id
          AND m.sender_id != $1::uuid
          AND mrs.id IS NULL
        ) as unread_count
      FROM conversations c
      JOIN users other_user ON (
        CASE
          WHEN c.user_a_id = $1::uuid THEN c.user_b_id
          ELSE c.user_a_id
        END = other_user.id
      )
      LEFT JOIN user_presence up ON other_user.id = up.user_id
      WHERE c.user_a_id = $1::uuid OR c.user_b_id = $1::uuid
      ORDER BY c.updated_at DESC
    `, [userId]);

    return result.rows;
  }

  async getConversationById(conversationId, userId) {
    logger.debug({ conversationId, userId }, 'Repository: Querying conversation by ID');

    const result = await pool.query(`
      SELECT
        c.*,
        -- Get both participants info
        json_build_array(
          json_build_object(
            'id', user_a.id,
            'email', user_a.email,
            'display_name', user_a.display_name,
            'avatar_url', user_a.avatar_url,
            'status', COALESCE(up_a.status, 'offline'),
            'last_seen', up_a.last_seen
          ),
          json_build_object(
            'id', user_b.id,
            'email', user_b.email,
            'display_name', user_b.display_name,
            'avatar_url', user_b.avatar_url,
            'status', COALESCE(up_b.status, 'offline'),
            'last_seen', up_b.last_seen
          )
        ) as participants,
        -- Get the other participant info (not the current user)
        json_build_object(
          'id', other_user.id,
          'email', other_user.email,
          'display_name', other_user.display_name,
          'avatar_url', other_user.avatar_url,
          'status', COALESCE(up_other.status, 'offline'),
          'last_seen', up_other.last_seen
        ) as other_participant
      FROM conversations c
      JOIN users user_a ON c.user_a_id = user_a.id
      JOIN users user_b ON c.user_b_id = user_b.id
      LEFT JOIN user_presence up_a ON user_a.id = up_a.user_id
      LEFT JOIN user_presence up_b ON user_b.id = up_b.user_id
      JOIN users other_user ON (
        CASE
          WHEN c.user_a_id = $2::uuid THEN c.user_b_id
          ELSE c.user_a_id
        END = other_user.id
      )
      LEFT JOIN user_presence up_other ON other_user.id = up_other.user_id
      WHERE c.id = $1::uuid
      AND (c.user_a_id = $2::uuid OR c.user_b_id = $2::uuid)
    `, [conversationId, userId]);

    logger.debug({ conversationId, userId, rowCount: result.rows.length }, 'Repository: Query result');

    return result.rows[0];
  }

  async findConversationByParticipants(userId1, userId2) {
    // Use the canonical ordering (conv_a, conv_b) to find conversation
    const result = await pool.query(`
      SELECT c.*
      FROM conversations c
      WHERE c.conv_a = LEAST($1::uuid, $2::uuid) AND c.conv_b = GREATEST($1::uuid, $2::uuid)
    `, [userId1, userId2]);

    return result.rows[0];
  }

  // Messages
  async createMessage({ conversationId, senderId, content, messageType = 'text', replyTo = null }) {
    const result = await pool.query(
      `INSERT INTO messages (conversation_id, sender_id, content, message_type, reply_to)
       VALUES ($1::uuid, $2::uuid, $3, $4, $5::uuid)
       RETURNING *`,
      [conversationId, senderId, content, messageType, replyTo]
    );

    return result.rows[0];
  }

  async getMessagesForConversation(conversationId, userId, limit = 50, offset = 0) {
    // First verify user is participant (check if user is either user_a or user_b)
    const participantCheck = await pool.query(
      'SELECT 1 FROM conversations WHERE id = $1::uuid AND (user_a_id = $2::uuid OR user_b_id = $2::uuid)',
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
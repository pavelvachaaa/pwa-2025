const chatRepository = require('@repositories/chat.repository');
const userRepository = require('@repositories/user.repository');
const logger = require('@utils/logger');

class UserService {

    async getAllUsers(currentUserId, limit = 20) {
        try {
            const users = await userRepository.getAllUsers(currentUserId, limit);
            return { users };
        } catch (error) {
            logger.error({ error: error.message, currentUserId }, 'Error getting all users');
            throw error;
        }
    }

    async searchUsers(query, currentUserId, limit = 20) {
        try {
            if (!query?.trim()) {
                return { users: [] };
            }

            const users = await userRepository.searchUsers(query.trim(), currentUserId, limit);
            return { users };
        } catch (error) {
            logger.error({ error: error.message, query, currentUserId }, 'Error searching users');
            throw error;
        }
    }


    async updateUserPresence(userId, status) {
        try {
            const validStatuses = ['online', 'away', 'offline'];
            if (!validStatuses.includes(status)) {
                throw new Error('Invalid status');
            }

            const presence = await chatRepository.updateUserPresence(userId, status);
            return { presence };
        } catch (error) {
            logger.error({ error: error.message, userId, status }, 'Error updating user presence');
            throw error;
        }
    }

    async getUsersPresence(userIds) {
        try {
            const presences = await chatRepository.getUserPresence(userIds);
            return { presences };
        } catch (error) {
            logger.error({ error: error.message, userIds }, 'Error getting users presence');
            throw error;
        }
    }
}

module.exports = new UserService();
const logger = require('@utils/logger').child({ module: 'user-service' });
const { ValidationError } = require('@utils/errors');

class UserService {
    constructor(userRepository) {
        this.userRepo = userRepository;
    }

    async getAllUsers(currentUserId, limit = 20) {
        try {
            const users = await this.userRepo.getAllUsers(currentUserId, limit);
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

            const users = await this.userRepo.searchUsers(query.trim(), currentUserId, limit);
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
                throw new ValidationError('Invalid status');
            }

            const presence = await this.userRepo.updateUserPresence(userId, status);
            return { presence };
        } catch (error) {
            logger.error({ error: error.message, userId, status }, 'Error updating user presence');
            throw error;
        }
    }

    async getUsersPresence(userIds) {
        try {
            const presences = await this.userRepo.getUserPresence(userIds);
            return { presences };
        } catch (error) {
            logger.error({ error: error.message, userIds }, 'Error getting users presence');
            throw error;
        }
    }
}

module.exports = UserService;
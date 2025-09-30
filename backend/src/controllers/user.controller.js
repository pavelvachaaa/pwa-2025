const logger = require('@utils/logger');

class UserController {
    constructor(userService) {
        this.userService = userService;
    }

    async getAllUsers(req, res) {
        try {
            const userId = req.user.id;
            const { limit = 20 } = req.query;

            const result = await this.userService.getAllUsers(userId, parseInt(limit));

            res.json({
                success: true,
                data: result.users
            });
        } catch (error) {
            logger.error({ error: error.message, userId: req.user?.userId }, 'Error getting all users');
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    // Search users
    async searchUsers(req, res) {
        try {
            const userId = req.user.id;
            const { q: query, limit = 20 } = req.query;

            if (!query || !query.trim()) {
                return res.json({
                    success: true,
                    data: []
                });
            }

            const result = await this.userService.searchUsers(query, userId, parseInt(limit));

            res.json({
                success: true,
                data: result.users
            });
        } catch (error) {
            logger.error({ error: error.message, query: req.query.q, userId: req.user?.userId }, 'Error searching users');
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    // Get user presence
    async getUsersPresence(req, res) {
        try {
            const { userIds } = req.query;

            if (!userIds) {
                return res.status(400).json({
                    success: false,
                    error: 'User IDs are required'
                });
            }

            const userIdArray = Array.isArray(userIds) ? userIds : userIds.split(',');
            const result = await this.userService.getUsersPresence(userIdArray);

            res.json({
                success: true,
                data: result.presences
            });
        } catch (error) {
            logger.error({ error: error.message, userIds: req.query.userIds }, 'Error getting users presence');
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

}

module.exports = UserController;
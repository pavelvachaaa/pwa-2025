const logger = require('@utils/logger').child({ module: 'presence-handlers' });

class PresenceHandlers {
  constructor(connectionManager, io) {
    this.connectionManager = connectionManager;
    this.io = io;
  }

  async handlePresenceUpdate(socket, userId, data) {
    try {
      const { status } = data;
      await this.connectionManager.updateUserPresence(userId, status, this.io);
      logger.debug({ userId, status }, 'User presence updated');
    } catch (error) {
      logger.error({ error: error.message, userId, data }, 'Error updating presence');
    }
  }

  async handleLogout(socket, userId) {
    try {
      await this.connectionManager.updateUserPresence(userId, 'offline', this.io);
      logger.debug({ userId }, 'User logged out and presence updated to offline');
      setTimeout(() => socket.disconnect(true), 50);
    } catch (error) {
      logger.error({ error: error.message, userId }, 'Error during logout');
    }
  }
}

module.exports = PresenceHandlers;

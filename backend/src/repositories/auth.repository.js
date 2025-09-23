const userRepository = require('./user.repository');
const oauthRepository = require('./oauth.repository');
const sessionRepository = require('./session.repository');

module.exports = {
  user: userRepository,
  oauth: oauthRepository,
  session: sessionRepository
};
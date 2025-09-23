const jwt = require('jsonwebtoken');
const config = require('./config');

function signAccessToken(user, sessionId) {
    return jwt.sign(
        {
            sub: user.id,
            sid: sessionId,
            email: user.email,
            name: user.display_name,
            iat: Math.floor(Date.now() / 1000)
        },
        config.jwtSecret,
        {
            expiresIn: config.jwtAccessTtl,
            algorithm: config.jwtAlgorithm
        }
    );
}

function verifyToken(token) {
    return jwt.verify(token, config.jwtSecret, {
        algorithms: [config.jwtAlgorithm]
    });
}

function parseExpiryTime(timeString) {
    const time = parseInt(timeString);
    if (!isNaN(time)) {
        return time * 1000;
    }

    const units = {
        's': 1000,
        'm': 60 * 1000,
        'h': 60 * 60 * 1000,
        'd': 24 * 60 * 60 * 1000
    };

    const match = timeString.match(/^(\d+)([smhd])$/);
    if (match) {
        const [, num, unit] = match;
        return parseInt(num) * units[unit];
    }

    throw new Error(`Invalid time format: ${timeString}`);
}

function getRefreshTokenExpiry() {
    const ttlMs = parseExpiryTime(config.jwtRefreshTtl);
    return new Date(Date.now() + ttlMs);
}

module.exports = {
    signAccessToken,
    verifyToken,
    getRefreshTokenExpiry,
    parseExpiryTime
};
const jwt = require('jsonwebtoken');
const config = require('./config');

function signToken(user) {
    return jwt.sign(
        {
            sub: user.id,
            email: user.email,
            name: user.full_name,
        },
        config.jwtSecret,
        { expiresIn: config.jwtExpiresIn }
    );
}

function verifyToken(token) {
    return jwt.verify(token, config.jwtSecret);
}

module.exports = { signToken, verifyToken };